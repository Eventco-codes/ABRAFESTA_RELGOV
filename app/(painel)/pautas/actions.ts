"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ID, Query } from "node-appwrite";
import { z } from "zod";

import { APPWRITE_DATABASE_ID, TABLES } from "@/lib/appwrite/constants";
import { requireRole } from "@/lib/auth";
import type { Pauta } from "@/lib/types";

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
  const { tablesDB, user } = await requireRole("administrador", "coordenador_relgov");
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
  const { tablesDB, user } = await requireRole("administrador", "coordenador_relgov");
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

export async function buscarPautasParaSelect() {
  const { tablesDB } = await requireRole("administrador", "coordenador_relgov");
  const { rows } = await tablesDB.listRows<Pauta>({
    databaseId: APPWRITE_DATABASE_ID,
    tableId: TABLES.pautas,
    queries: [Query.equal("ativo", true), Query.limit(200)],
  });
  return rows.map((row) => ({ $id: row.$id, titulo: row.titulo }));
}
