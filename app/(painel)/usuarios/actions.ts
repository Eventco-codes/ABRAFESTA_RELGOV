"use server";

import { revalidatePath } from "next/cache";
import { ID } from "node-appwrite";
import { z } from "zod";

import { createAdminClient } from "@/lib/appwrite/server";
import { requireRole } from "@/lib/auth";
import { LABELS, type RelgovRole } from "@/lib/appwrite/constants";

const conviteSchema = z.object({
  name: z.string().min(2, "Informe o nome."),
  email: z.string().email("E-mail inválido."),
  role: z.enum([LABELS.administrador, LABELS.coordenadorRelgov, LABELS.leitor]),
});

export interface ConviteFormState {
  error?: string;
  senhaTemporaria?: string;
}

function gerarSenhaTemporaria(): string {
  return Math.random().toString(36).slice(-6) + Math.random().toString(36).slice(-6);
}

/**
 * Cria a conta pelo Users API (convite do Administrador — sem self-signup).
 * Sem envio de e-mail configurado neste MVP: a senha temporária é mostrada
 * uma única vez na tela para o Administrador repassar ao convidado.
 */
export async function convidarUsuario(
  _prev: ConviteFormState,
  formData: FormData
): Promise<ConviteFormState> {
  await requireRole("administrador");
  const parsed = conviteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { users } = createAdminClient();
  const senhaTemporaria = gerarSenhaTemporaria();

  const novoUsuario = await users.create({
    userId: ID.unique(),
    email: parsed.data.email,
    password: senhaTemporaria,
    name: parsed.data.name,
  });

  await users.updateLabels({ userId: novoUsuario.$id, labels: [parsed.data.role] });
  await users.updatePrefs({
    userId: novoUsuario.$id,
    prefs: { receberAlertas: true, ultimaAbaPainel: "resumo" },
  });

  revalidatePath("/usuarios");
  return { senhaTemporaria };
}

export async function atualizarPapelUsuario(userId: string, role: RelgovRole) {
  await requireRole("administrador");
  const { users } = createAdminClient();
  await users.updateLabels({ userId, labels: [role] });
  revalidatePath("/usuarios");
}

export async function alternarReceberAlertas(userId: string, receberAlertas: boolean) {
  await requireRole("administrador");
  const { users } = createAdminClient();
  await users.updatePrefs({ userId, prefs: { receberAlertas } });
  revalidatePath("/usuarios");
}

export async function alternarStatusUsuario(userId: string, ativo: boolean) {
  await requireRole("administrador");
  const { users } = createAdminClient();
  await users.updateStatus({ userId, status: ativo });
  revalidatePath("/usuarios");
}
