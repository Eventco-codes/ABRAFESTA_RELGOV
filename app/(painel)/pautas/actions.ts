"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ID, Query } from "node-appwrite";
import { z } from "zod";

import { APPWRITE_DATABASE_ID, TABLES } from "@/lib/appwrite/constants";
import { requireRole } from "@/lib/auth";
import { calcularMesclagem, MAX_REGISTROS_POR_MESCLAGEM } from "@/lib/relgov/mesclar";
import type { Movimentacao, Pauta } from "@/lib/types";

const pautaSchema = z.object({
  titulo: z.string().min(3, "Informe o título."),
  eixo: z.string().min(2, "Informe o eixo."),
  atuacao: z.string().min(3, "Informe a atuação."),
  contexto: z.string().min(3, "Informe o contexto."),
  situacaoAtual: z.string().min(3, "Informe a situação atual."),
  interlocutores: z.string().min(2, "Informe os interlocutores."),
  prioridade: z.enum(["Alta", "Media", "Baixa"]),
  status: z.string().min(2, "Informe o status."),
  fonteReferencia: z.string().min(2, "Informe a fonte/referência."),
  linkOficial: z.string().url().optional().or(z.literal("")),
  proximosEncaminhamentos: z.string().optional(),
});

export interface PautaFormState {
  error?: string;
}

function encaminhamentosDoTexto(texto: string | undefined): string[] {
  if (!texto) return [];
  return texto
    .split("\n")
    .map((linha) => linha.trim())
    .filter(Boolean);
}

export async function createPauta(
  _prev: PautaFormState,
  formData: FormData
): Promise<PautaFormState> {
  const { tablesDB, user } = await requireRole("administrador");
  const parsed = pautaSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { proximosEncaminhamentos, ...pautaData } = parsed.data;
  const pautaId = ID.unique();

  await tablesDB.createRow({
    databaseId: APPWRITE_DATABASE_ID,
    tableId: TABLES.pautas,
    rowId: pautaId,
    data: { ...pautaData, linkOficial: pautaData.linkOficial || null, ativo: true },
  });

  const itens = encaminhamentosDoTexto(proximosEncaminhamentos);
  await Promise.all(
    itens.map((texto, ordem) =>
      tablesDB.createRow({
        databaseId: APPWRITE_DATABASE_ID,
        tableId: TABLES.encaminhamentos,
        rowId: ID.unique(),
        data: { pautaId, texto, ordem, concluido: false, concluidoEm: null, concluidoPorNome: null },
      })
    )
  );

  await tablesDB.createRow({
    databaseId: APPWRITE_DATABASE_ID,
    tableId: TABLES.movimentacoes,
    rowId: ID.unique(),
    data: {
      pautaId,
      data: new Date().toISOString(),
      origem: "REGISTRO_MANUAL",
      titulo: "Pauta criada",
      descricao: `Cadastrada por ${user.name || user.email}.`,
      criadoPorNome: user.name || user.email,
    },
  });

  revalidatePath("/pautas");
  redirect(`/pautas/${pautaId}`);
}

export async function updatePauta(
  pautaId: string,
  _prev: PautaFormState,
  formData: FormData
): Promise<PautaFormState> {
  const { tablesDB } = await requireRole("administrador");
  const parsed = pautaSchema.omit({ proximosEncaminhamentos: true }).safeParse(
    Object.fromEntries(formData)
  );
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  await tablesDB.updateRow({
    databaseId: APPWRITE_DATABASE_ID,
    tableId: TABLES.pautas,
    rowId: pautaId,
    data: { ...parsed.data, linkOficial: parsed.data.linkOficial || null },
  });

  revalidatePath(`/pautas/${pautaId}`);
  redirect(`/pautas/${pautaId}`);
}

export async function toggleAtivoPauta(pautaId: string, ativo: boolean) {
  const { tablesDB } = await requireRole("administrador");
  await tablesDB.updateRow({
    databaseId: APPWRITE_DATABASE_ID,
    tableId: TABLES.pautas,
    rowId: pautaId,
    data: { ativo },
  });
  revalidatePath(`/pautas/${pautaId}`);
  revalidatePath("/pautas");
}

export async function toggleEncaminhamento(
  pautaId: string,
  encaminhamentoId: string,
  concluido: boolean
) {
  const { tablesDB, user } = await requireRole("administrador", "coordenadorrelgov");
  await tablesDB.updateRow({
    databaseId: APPWRITE_DATABASE_ID,
    tableId: TABLES.encaminhamentos,
    rowId: encaminhamentoId,
    data: {
      concluido,
      concluidoEm: concluido ? new Date().toISOString() : null,
      concluidoPorNome: concluido ? user.name || user.email : null,
    },
  });
  revalidatePath(`/pautas/${pautaId}`);
}

const movimentacaoSchema = z.object({
  titulo: z.string().min(3, "Informe um título."),
  descricao: z.string().min(3, "Descreva a movimentação."),
});

export interface MovimentacaoFormState {
  error?: string;
}

export async function registrarMovimentacao(
  pautaId: string,
  _prev: MovimentacaoFormState,
  formData: FormData
): Promise<MovimentacaoFormState> {
  const { tablesDB, user } = await requireRole("administrador", "coordenadorrelgov");
  const parsed = movimentacaoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  await tablesDB.createRow({
    databaseId: APPWRITE_DATABASE_ID,
    tableId: TABLES.movimentacoes,
    rowId: ID.unique(),
    data: {
      pautaId,
      data: new Date().toISOString(),
      origem: "REGISTRO_MANUAL",
      titulo: parsed.data.titulo,
      descricao: parsed.data.descricao,
      criadoPorNome: user.name || user.email,
    },
  });

  revalidatePath(`/pautas/${pautaId}`);
  return {};
}

export interface MesclarMovimentacoesState {
  error?: string;
  mesclados?: number;
}

/**
 * Une movimentações da mesma pauta em um único registro (o mais recente).
 * Ordem pensada para nunca perder conteúdo: primeiro grava o texto unido no registro
 * que permanece; só depois exclui os demais. Se uma exclusão falhar, o conteúdo já está
 * preservado (no máximo fica duplicado) e repetir a mesclagem remove a sobra.
 */
export async function mesclarMovimentacoes(
  pautaId: string,
  movimentacaoIds: string[]
): Promise<MesclarMovimentacoesState> {
  const { tablesDB } = await requireRole("administrador", "coordenadorrelgov");

  const ids = [...new Set(movimentacaoIds)];
  if (ids.length < 2) return { error: "Selecione ao menos 2 registros para mesclar." };
  if (ids.length > MAX_REGISTROS_POR_MESCLAGEM) {
    return { error: `Selecione no máximo ${MAX_REGISTROS_POR_MESCLAGEM} registros por mesclagem.` };
  }

  // Sempre relê do banco: o texto vem do servidor, nunca do cliente.
  const { rows } = await tablesDB.listRows<Movimentacao>({
    databaseId: APPWRITE_DATABASE_ID,
    tableId: TABLES.movimentacoes,
    queries: [
      Query.equal("pautaId", pautaId),
      Query.equal("$id", ids),
      Query.limit(MAX_REGISTROS_POR_MESCLAGEM),
    ],
  });
  if (rows.length !== ids.length) {
    return {
      error:
        "Alguns registros não existem mais ou não pertencem a esta pauta. Atualize a página e tente novamente.",
    };
  }

  const mesclagem = calcularMesclagem(rows);
  if (!mesclagem.ok) return { error: mesclagem.error };

  await tablesDB.updateRow({
    databaseId: APPWRITE_DATABASE_ID,
    tableId: TABLES.movimentacoes,
    rowId: mesclagem.principalId,
    data: { descricao: mesclagem.descricao, criadoPorNome: mesclagem.criadoPorNome },
  });

  const falhas: string[] = [];
  for (const rowId of mesclagem.excluirIds) {
    try {
      await tablesDB.deleteRow({
        databaseId: APPWRITE_DATABASE_ID,
        tableId: TABLES.movimentacoes,
        rowId,
      });
    } catch {
      falhas.push(rowId);
    }
  }

  revalidatePath(`/pautas/${pautaId}`);
  revalidatePath("/tramitacao");
  revalidatePath("/painel");

  if (falhas.length > 0) {
    return {
      error: `O conteúdo foi unido, mas ${falhas.length} registro(s) antigo(s) não puderam ser excluídos. Nada foi perdido; repita a mesclagem para remover a sobra.`,
    };
  }
  return { mesclados: ids.length };
}

export async function buscarPautasParaSelect() {
  const { tablesDB } = await requireRole("administrador", "coordenadorrelgov");
  const { rows } = await tablesDB.listRows<Pauta>({
    databaseId: APPWRITE_DATABASE_ID,
    tableId: TABLES.pautas,
    queries: [Query.equal("ativo", true), Query.limit(200)],
  });
  return rows.map((row) => ({ $id: row.$id, titulo: row.titulo }));
}

const edicaoMovimentacaoSchema = movimentacaoSchema.extend({
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida."),
});

export async function editarMovimentacao(
  pautaId: string,
  movimentacaoId: string,
  _prev: MovimentacaoFormState,
  formData: FormData
): Promise<MovimentacaoFormState> {
  const { tablesDB } = await requireRole("administrador", "coordenadorrelgov");
  const parsed = edicaoMovimentacaoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  await tablesDB.updateRow({
    databaseId: APPWRITE_DATABASE_ID,
    tableId: TABLES.movimentacoes,
    rowId: movimentacaoId,
    data: {
      titulo: parsed.data.titulo,
      descricao: parsed.data.descricao,
      // meio-dia em Brasília evita troca de dia por fuso
      data: new Date(`${parsed.data.data}T12:00:00-03:00`).toISOString(),
    },
  });

  revalidatePath(`/pautas/${pautaId}`);
  revalidatePath("/tramitacao");
  return {};
}

export async function excluirMovimentacao(pautaId: string, movimentacaoId: string) {
  const { tablesDB } = await requireRole("administrador", "coordenadorrelgov");
  await tablesDB.deleteRow({
    databaseId: APPWRITE_DATABASE_ID,
    tableId: TABLES.movimentacoes,
    rowId: movimentacaoId,
  });
  revalidatePath(`/pautas/${pautaId}`);
  revalidatePath("/tramitacao");
}
