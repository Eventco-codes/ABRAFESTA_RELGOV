"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ID } from "node-appwrite";
import { z } from "zod";

import { APPWRITE_DATABASE_ID, STORAGE_BUCKET_ID, TABLES } from "@/lib/appwrite/constants";
import { requireRole } from "@/lib/auth";
import { excluirPendencia as excluirPendenciaDb } from "@/lib/relgov/data";

const pendenciaSchema = z.object({
  pautaId: z
    .string()
    .optional()
    .default("")
    .transform((v) => (v ? v : null)),
  descricao: z.string().min(3, "Descreva a pendência."),
  responsavel: z.string().min(2, "Informe o responsável."),
  status: z.string().min(2, "Informe o status."),
  prioridade: z.enum(["Alta", "Media", "Baixa"]),
  proximaCobranca: z.string().min(3, "Descreva a próxima cobrança."),
  prazoSugerido: z.string().min(1, "Informe o prazo."),
  evidencia: z.string().optional().default(""),
  observacoes: z.string().optional().default(""),
  comentario: z
    .string()
    .optional()
    .default("")
    .transform((v) => (v.trim() ? v.trim() : null)),
});

export interface PendenciaFormState {
  error?: string;
}

export async function createPendencia(
  _prev: PendenciaFormState,
  formData: FormData
): Promise<PendenciaFormState> {
  const { tablesDB } = await requireRole("administrador", "coordenadorrelgov");
  const parsed = pendenciaSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const pendenciaId = ID.unique();
  await tablesDB.createRow({
    databaseId: APPWRITE_DATABASE_ID,
    tableId: TABLES.pendencias,
    rowId: pendenciaId,
    data: { ...parsed.data, ultimaMovimentacao: new Date().toISOString().slice(0, 10) },
  });

  revalidatePath("/pendencias");
  if (parsed.data.pautaId) revalidatePath(`/pautas/${parsed.data.pautaId}`);
  redirect("/pendencias");
}

export async function updatePendencia(
  pendenciaId: string,
  _prev: PendenciaFormState,
  formData: FormData
): Promise<PendenciaFormState> {
  const { tablesDB } = await requireRole("administrador", "coordenadorrelgov");
  const parsed = pendenciaSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  await tablesDB.updateRow({
    databaseId: APPWRITE_DATABASE_ID,
    tableId: TABLES.pendencias,
    rowId: pendenciaId,
    data: {
      ...parsed.data,
      ultimaMovimentacao: new Date().toISOString().slice(0, 10),
    },
  });

  revalidatePath("/pendencias");
  if (parsed.data.pautaId) revalidatePath(`/pautas/${parsed.data.pautaId}`);
  redirect("/pendencias");
}

export async function marcarPendenciaConcluida(pendenciaId: string, pautaId: string | null) {
  const { tablesDB } = await requireRole("administrador", "coordenadorrelgov");
  await tablesDB.updateRow({
    databaseId: APPWRITE_DATABASE_ID,
    tableId: TABLES.pendencias,
    rowId: pendenciaId,
    data: { status: "Concluída", ultimaMovimentacao: new Date().toISOString().slice(0, 10) },
  });
  revalidatePath("/pendencias");
  if (pautaId) revalidatePath(`/pautas/${pautaId}`);
}

/** Registra que uma cobrança foi disparada (abre o rascunho no cliente de e-mail do usuário — ver PendenciaAcoes). */
export async function registrarEnvioCobranca(pendenciaId: string, pautaId: string | null) {
  const { tablesDB } = await requireRole("administrador", "coordenadorrelgov");
  await tablesDB.updateRow({
    databaseId: APPWRITE_DATABASE_ID,
    tableId: TABLES.pendencias,
    rowId: pendenciaId,
    data: { ultimaMovimentacao: new Date().toISOString().slice(0, 10) },
  });
  revalidatePath("/pendencias");
  revalidatePath("/pendencias/cobrancas");
  if (pautaId) revalidatePath(`/pautas/${pautaId}`);
}

export async function excluirPendencia(pendenciaId: string, pautaId: string | null) {
  const { tablesDB, storage } = await requireRole("administrador", "coordenadorrelgov");
  await excluirPendenciaDb(tablesDB, storage, pendenciaId);
  revalidatePath("/pendencias");
  revalidatePath("/pendencias/cobrancas");
  if (pautaId) revalidatePath(`/pautas/${pautaId}`);
}

export interface AnexoFormState {
  error?: string;
}

/** Anexa um documento ou imagem a uma pendência. */
export async function uploadAnexoPendencia(
  pendenciaId: string,
  _prev: AnexoFormState,
  formData: FormData
): Promise<AnexoFormState> {
  const { tablesDB, storage, user } = await requireRole("administrador", "coordenadorrelgov");

  const arquivo = formData.get("arquivo");
  if (!(arquivo instanceof File) || arquivo.size === 0) {
    return { error: "Selecione um arquivo." };
  }

  try {
    const arquivoCriado = await storage.createFile({
      bucketId: STORAGE_BUCKET_ID,
      fileId: ID.unique(),
      file: arquivo,
    });
    await tablesDB.createRow({
      databaseId: APPWRITE_DATABASE_ID,
      tableId: TABLES.pendenciaAnexos,
      rowId: ID.unique(),
      data: {
        pendenciaId,
        fileId: arquivoCriado.$id,
        nome: arquivo.name,
        tamanho: arquivo.size,
        tipoMime: arquivo.type || null,
        criadoPorNome: user.name || user.email,
      },
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Falha ao enviar o arquivo." };
  }

  revalidatePath(`/pendencias/${pendenciaId}/editar`);
  return {};
}

/** Remove um anexo de pendência (arquivo no Storage + linha). */
export async function excluirAnexoPendencia(anexoId: string, pendenciaId: string) {
  const { tablesDB, storage } = await requireRole("administrador", "coordenadorrelgov");

  const anexo = await tablesDB.getRow({
    databaseId: APPWRITE_DATABASE_ID,
    tableId: TABLES.pendenciaAnexos,
    rowId: anexoId,
  });

  await storage.deleteFile({ bucketId: STORAGE_BUCKET_ID, fileId: anexo.fileId as string });
  await tablesDB.deleteRow({ databaseId: APPWRITE_DATABASE_ID, tableId: TABLES.pendenciaAnexos, rowId: anexoId });

  revalidatePath(`/pendencias/${pendenciaId}/editar`);
}
