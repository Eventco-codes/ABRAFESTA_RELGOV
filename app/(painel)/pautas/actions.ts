"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ID, Query } from "node-appwrite";
import { z } from "zod";

import { APPWRITE_DATABASE_ID, STORAGE_BUCKET_ID, TABLES } from "@/lib/appwrite/constants";
import { requireRole } from "@/lib/auth";
import { excluirPautaDefinitivamente } from "@/lib/relgov/data";
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
  autor: z.string().optional(),
  dataApresentacao: z.string().optional(),
  ementa: z.string().optional(),
  dataUltimaMovimentacao: z.string().optional(),
  incluirTramitacao: z.enum(["true", "false"]),
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

  const { proximosEncaminhamentos, incluirTramitacao, ...pautaData } = parsed.data;
  const pautaId = ID.unique();

  await tablesDB.createRow({
    databaseId: APPWRITE_DATABASE_ID,
    tableId: TABLES.pautas,
    rowId: pautaId,
    data: {
      ...pautaData,
      linkOficial: pautaData.linkOficial || null,
      autor: pautaData.autor || null,
      dataApresentacao: pautaData.dataApresentacao || null,
      ementa: pautaData.ementa || null,
      dataUltimaMovimentacao: pautaData.dataUltimaMovimentacao || null,
      incluirTramitacao: incluirTramitacao === "true",
      ativo: true,
    },
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
    data: {
      ...parsed.data,
      linkOficial: parsed.data.linkOficial || null,
      autor: parsed.data.autor || null,
      dataApresentacao: parsed.data.dataApresentacao || null,
      ementa: parsed.data.ementa || null,
      dataUltimaMovimentacao: parsed.data.dataUltimaMovimentacao || null,
      incluirTramitacao: parsed.data.incluirTramitacao === "true",
    },
  });

  revalidatePath(`/pautas/${pautaId}`);
  revalidatePath("/tramitacao");
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

/** Botão "Excluir" — soft delete: some do painel, some do banco definitivamente em 30 dias (lixeira). */
export async function excluirPauta(pautaId: string) {
  const { tablesDB } = await requireRole("administrador");
  await tablesDB.updateRow({
    databaseId: APPWRITE_DATABASE_ID,
    tableId: TABLES.pautas,
    rowId: pautaId,
    data: { excluidoEm: new Date().toISOString() },
  });
  revalidatePath("/pautas");
  revalidatePath("/pautas/lixeira");
  revalidatePath("/tramitacao");
}

/** Botão "Restaurar" da lixeira — desfaz a exclusão dentro dos 30 dias. */
export async function restaurarPauta(pautaId: string) {
  const { tablesDB } = await requireRole("administrador");
  await tablesDB.updateRow({
    databaseId: APPWRITE_DATABASE_ID,
    tableId: TABLES.pautas,
    rowId: pautaId,
    data: { excluidoEm: null },
  });
  revalidatePath("/pautas");
  revalidatePath("/pautas/lixeira");
  revalidatePath("/tramitacao");
}

/** Botão "Excluir definitivamente agora" da lixeira — pula a espera de 30 dias. */
export async function excluirPautaAgora(pautaId: string) {
  const { tablesDB, storage } = await requireRole("administrador");
  await excluirPautaDefinitivamente(tablesDB, storage, pautaId);
  revalidatePath("/pautas/lixeira");
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
  const { tablesDB, storage, user } = await requireRole("administrador", "coordenadorrelgov");
  const parsed = movimentacaoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const criadoPorNome = user.name || user.email;
  const movimentacaoId = ID.unique();
  await tablesDB.createRow({
    databaseId: APPWRITE_DATABASE_ID,
    tableId: TABLES.movimentacoes,
    rowId: movimentacaoId,
    data: {
      pautaId,
      data: new Date().toISOString(),
      origem: "REGISTRO_MANUAL",
      titulo: parsed.data.titulo,
      descricao: parsed.data.descricao,
      criadoPorNome,
    },
  });

  const arquivo = formData.get("arquivo");
  if (arquivo instanceof File && arquivo.size > 0) {
    try {
      await criarAnexo(tablesDB, storage, { pautaId, movimentacaoId, arquivo, criadoPorNome });
    } catch (err) {
      revalidatePath(`/pautas/${pautaId}`);
      return { error: err instanceof Error ? err.message : "Movimentação salva, mas o anexo falhou." };
    }
  }

  revalidatePath(`/pautas/${pautaId}`);
  revalidatePath("/tramitacao");
  return {};
}

/** Botão "Criar" da Tramitação — mesmo fluxo de registrarMovimentacao, mas com a pauta escolhida no próprio formulário. */
export async function registrarMovimentacaoComPauta(
  _prev: MovimentacaoFormState,
  formData: FormData
): Promise<MovimentacaoFormState> {
  const pautaId = String(formData.get("pautaId") ?? "").trim();
  if (!pautaId) {
    return { error: "Selecione a pauta." };
  }

  const { tablesDB } = await requireRole("administrador", "coordenadorrelgov");
  try {
    await tablesDB.getRow({ databaseId: APPWRITE_DATABASE_ID, tableId: TABLES.pautas, rowId: pautaId });
  } catch {
    return { error: "Pauta não encontrada." };
  }

  return registrarMovimentacao(pautaId, _prev, formData);
}

const novaPautaRapidaSchema = z.object({
  pautaTitulo: z.string().min(3, "Informe o título da pauta."),
  pautaEixo: z.string().min(2, "Informe o eixo."),
  pautaLinkOficial: z.string().url().optional().or(z.literal("")),
  movTitulo: z.string().optional(),
  movDescricao: z.string().optional(),
});

/**
 * Botão "Nova pauta" do "+ Criar" da Tramitação — cadastro rápido: só título,
 * eixo e link oficial monitorado são pedidos aqui; os demais campos da pauta
 * (atuação, contexto, interlocutores...) ficam com um valor inicial genérico
 * e devem ser completados depois em "Editar pauta".
 */
export async function criarPautaRapida(
  _prev: MovimentacaoFormState,
  formData: FormData
): Promise<MovimentacaoFormState> {
  const { tablesDB, storage, user } = await requireRole("administrador", "coordenadorrelgov");
  const parsed = novaPautaRapidaSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const criadoPorNome = user.name || user.email;
  const pautaId = ID.unique();

  await tablesDB.createRow({
    databaseId: APPWRITE_DATABASE_ID,
    tableId: TABLES.pautas,
    rowId: pautaId,
    data: {
      titulo: parsed.data.pautaTitulo,
      eixo: parsed.data.pautaEixo,
      atuacao: "A detalhar.",
      contexto: "A detalhar.",
      situacaoAtual: "Em acompanhamento inicial.",
      interlocutores: "A definir",
      prioridade: "Media",
      status: "Em acompanhamento",
      fonteReferencia: "Cadastrado via Tramitação",
      linkOficial: parsed.data.pautaLinkOficial || null,
      incluirTramitacao: true,
      ativo: true,
    },
  });

  const movimentacaoId = ID.unique();
  await tablesDB.createRow({
    databaseId: APPWRITE_DATABASE_ID,
    tableId: TABLES.movimentacoes,
    rowId: movimentacaoId,
    data: {
      pautaId,
      data: new Date().toISOString(),
      origem: "REGISTRO_MANUAL",
      titulo: parsed.data.movTitulo || "Pauta criada",
      descricao: parsed.data.movDescricao || `Cadastrada por ${criadoPorNome} via Tramitação.`,
      criadoPorNome,
    },
  });

  const arquivo = formData.get("arquivo");
  if (arquivo instanceof File && arquivo.size > 0) {
    try {
      await criarAnexo(tablesDB, storage, { pautaId, movimentacaoId, arquivo, criadoPorNome });
    } catch (err) {
      revalidatePath("/tramitacao");
      revalidatePath("/pautas");
      return { error: err instanceof Error ? err.message : "Pauta criada, mas o anexo falhou." };
    }
  }

  revalidatePath("/tramitacao");
  revalidatePath("/pautas");
  return {};
}

interface CriarAnexoInput {
  pautaId: string;
  movimentacaoId: string | null;
  arquivo: File;
  criadoPorNome: string;
}

async function criarAnexo(
  tablesDB: Awaited<ReturnType<typeof requireRole>>["tablesDB"],
  storage: Awaited<ReturnType<typeof requireRole>>["storage"],
  { pautaId, movimentacaoId, arquivo, criadoPorNome }: CriarAnexoInput
) {
  const arquivoCriado = await storage.createFile({
    bucketId: STORAGE_BUCKET_ID,
    fileId: ID.unique(),
    file: arquivo,
  });

  await tablesDB.createRow({
    databaseId: APPWRITE_DATABASE_ID,
    tableId: TABLES.anexos,
    rowId: ID.unique(),
    data: {
      pautaId,
      movimentacaoId,
      fileId: arquivoCriado.$id,
      nome: arquivo.name,
      tamanho: arquivo.size,
      tipoMime: arquivo.type || null,
      criadoPorNome,
    },
  });
}

export interface AnexoFormState {
  error?: string;
}

/** Anexa um documento diretamente à pauta (sem vincular a uma movimentação específica). */
export async function uploadAnexoPauta(
  pautaId: string,
  _prev: AnexoFormState,
  formData: FormData
): Promise<AnexoFormState> {
  const { tablesDB, storage, user } = await requireRole("administrador", "coordenadorrelgov");

  const arquivo = formData.get("arquivo");
  if (!(arquivo instanceof File) || arquivo.size === 0) {
    return { error: "Selecione um arquivo." };
  }

  try {
    await criarAnexo(tablesDB, storage, {
      pautaId,
      movimentacaoId: null,
      arquivo,
      criadoPorNome: user.name || user.email,
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Falha ao enviar o arquivo." };
  }

  revalidatePath(`/pautas/${pautaId}`);
  return {};
}

/** Anexa um documento a uma movimentação já registrada (usado no "+ anexar" da Tramitação). */
export async function uploadAnexoMovimentacao(
  pautaId: string,
  movimentacaoId: string,
  _prev: AnexoFormState,
  formData: FormData
): Promise<AnexoFormState> {
  const { tablesDB, storage, user } = await requireRole("administrador", "coordenadorrelgov");

  const arquivo = formData.get("arquivo");
  if (!(arquivo instanceof File) || arquivo.size === 0) {
    return { error: "Selecione um arquivo." };
  }

  try {
    await criarAnexo(tablesDB, storage, {
      pautaId,
      movimentacaoId,
      arquivo,
      criadoPorNome: user.name || user.email,
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Falha ao enviar o arquivo." };
  }

  revalidatePath(`/pautas/${pautaId}`);
  revalidatePath("/tramitacao");
  return {};
}

/** Remove um anexo (arquivo no Storage + linha em `anexos`). */
export async function excluirAnexo(anexoId: string, pautaId: string) {
  const { tablesDB, storage } = await requireRole("administrador", "coordenadorrelgov");

  const anexo = await tablesDB.getRow({
    databaseId: APPWRITE_DATABASE_ID,
    tableId: TABLES.anexos,
    rowId: anexoId,
  });

  await storage.deleteFile({ bucketId: STORAGE_BUCKET_ID, fileId: anexo.fileId as string });
  await tablesDB.deleteRow({ databaseId: APPWRITE_DATABASE_ID, tableId: TABLES.anexos, rowId: anexoId });

  revalidatePath(`/pautas/${pautaId}`);
  revalidatePath("/tramitacao");
}

export async function buscarPautasParaSelect() {
  const { tablesDB } = await requireRole("administrador", "coordenadorrelgov");
  const { rows } = await tablesDB.listRows<Pauta>({
    databaseId: APPWRITE_DATABASE_ID,
    tableId: TABLES.pautas,
    queries: [Query.equal("ativo", true), Query.isNull("excluidoEm"), Query.limit(200)],
  });
  return rows.map((row) => ({ $id: row.$id, titulo: row.titulo }));
}
