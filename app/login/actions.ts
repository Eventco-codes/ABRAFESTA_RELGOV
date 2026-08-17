"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AppwriteException } from "node-appwrite";

import { createAnonClient, createSessionClient } from "@/lib/appwrite/server";
import { SESSION_COOKIE_NAME, hasRelgovAccess } from "@/lib/appwrite/constants";

export interface LoginState {
  error?: string;
}

async function persistSessionCookie(secret: string, expire: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, secret, {
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

  const { account } = createAnonClient();

  let session;
  try {
    session = await account.createEmailPasswordSession({ email, password });
  } catch (err) {
    if (err instanceof AppwriteException) {
      return { error: "E-mail ou senha inválidos." };
    }
    throw err;
  }

  const { account: sessionAccount } = createSessionClient(session.secret);
  const user = await sessionAccount.get();

  if (!hasRelgovAccess(user.labels)) {
    await sessionAccount.deleteSession({ sessionId: "current" });
    return {
      error:
        "Este e-mail ainda não tem acesso ao RelGov. Peça um convite ao administrador.",
    };
  }

  await persistSessionCookie(session.secret, session.expire);
  redirect("/painel");
}

export async function logout() {
  const cookieStore = await cookies();
  const secret = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (secret) {
    try {
      const { account } = createSessionClient(secret);
      await account.deleteSession({ sessionId: "current" });
    } catch {
      // sessão já pode ter expirado no Appwrite — seguir e limpar o cookie local
    }
  }
  cookieStore.delete(SESSION_COOKIE_NAME);
  redirect("/login");
}
