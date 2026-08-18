"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { createSessionClient } from "@/lib/appwrite/server";
import { createEmailPasswordSessionCookie, SessionCreationError } from "@/lib/appwrite/session";
import { SESSION_COOKIE_NAME, hasRelgovAccess } from "@/lib/appwrite/constants";

export interface LoginState {
  error?: string;
}

async function persistSessionCookie(value: string, expire: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(expire),
  });
}

export async function loginWithPassword(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Informe e-mail e senha." };
  }

  let session;
  try {
    session = await createEmailPasswordSessionCookie(email, password);
  } catch (err) {
    if (err instanceof SessionCreationError) {
      return { error: "E-mail ou senha inválidos." };
    }
    throw err;
  }

  const { account: sessionAccount } = createSessionClient(session.value);
  const user = await sessionAccount.get();

  if (!hasRelgovAccess(user.labels)) {
    await sessionAccount.deleteSession({ sessionId: "current" });
    return {
      error:
        "Este e-mail ainda não tem acesso ao RelGov. Peça um convite ao administrador.",
    };
  }

  await persistSessionCookie(session.value, session.expire);
  redirect("/painel");
}

export async function logout() {
  const cookieStore = await cookies();
  const value = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (value) {
    try {
      const { account } = createSessionClient(value);
      await account.deleteSession({ sessionId: "current" });
    } catch {
      // sessão já pode ter expirado no Appwrite — seguir e limpar o cookie local
    }
  }
  cookieStore.delete(SESSION_COOKIE_NAME);
  redirect("/login");
}
