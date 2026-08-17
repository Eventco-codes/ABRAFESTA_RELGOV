"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ID } from "node-appwrite";
import { z } from "zod";

import { APPWRITE_DATABASE_ID, TABLES } from "@/lib/appwrite/constants";
import { requireRole } from "@/lib/auth";

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
});

export interface PendenciaFormState {
  error?: string;
}

export async function createPendencia(
  _prev: PendenciaFormState,
  formData: FormData
): Promise<PendenciaFormState> {
  const { tablesDB } = await requireRole("administrador", "coordenador_relgov");
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
  const { tablesDB } = await requireRole("administrador", "coordenador_relgov");
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
  const { tablesDB } = await requireRole("administrador", "coordenador_relgov");
  await tablesDB.updateRow({
    databaseId: APPWRITE_DATABASE_ID,
    tableId: TABLES.pendencias,
    rowId: pendenciaId,
    data: { status: "Concluída", ultimaMovimentacao: new Date().toISOString().slice(0, 10) },
  });
  revalidatePath("/pendencias");
  if (pautaId) revalidatePath(`/pautas/${pautaId}`);
}
