import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Models, Storage, TablesDB } from "node-appwrite";

import { createSessionClient } from "@/lib/appwrite/server";
import {
  LABELS,
  SESSION_COOKIE_NAME,
  hasRelgovAccess,
  type RelgovRole,
} from "@/lib/appwrite/constants";

export type RelgovUser = Models.User<Models.Preferences> & {
  role: RelgovRole | null;
};

export interface RelgovSession {
  user: RelgovUser;
  tablesDB: TablesDB;
  storage: Storage;
  sessionSecret: string;
}

function pickRole(labels: string[]): RelgovRole | null {
  if (labels.includes(LABELS.administrador)) return LABELS.administrador;
  if (labels.includes(LABELS.coordenadorRelgov)) return LABELS.coordenadorRelgov;
  if (labels.includes(LABELS.leitor)) return LABELS.leitor;
  return null;
}

/**
 * Lê a sessão do cookie httpOnly e retorna o usuário atual (ou null).
 * Nunca lança — quem precisa de sessão obrigatória usa requireSession()/requireUser().
 */
export async function getCurrentUser(): Promise<RelgovUser | null> {
  const cookieStore = await cookies();
  const sessionSecret = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionSecret) return null;

  try {
    const { account } = createSessionClient(sessionSecret);
    const user = await account.get();
    return { ...user, role: pickRole(user.labels) };
  } catch {
    return null;
  }
}

/**
 * Sessão obrigatória + cliente TablesDB pronto para consultar dados —
 * a maioria das páginas do painel usa isto direto. Redireciona para
 * /login se a sessão não existir, tiver expirado, ou o usuário não
 * tiver mais nenhum dos Labels de acesso ao RelGov.
 */
export async function requireSession(): Promise<RelgovSession> {
  const cookieStore = await cookies();
  const sessionSecret = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionSecret) {
    redirect("/login");
  }

  const { account, tablesDB, storage } = createSessionClient(sessionSecret);

  let user: Models.User<Models.Preferences>;
  try {
    user = await account.get();
  } catch {
    redirect("/login");
  }

  if (!hasRelgovAccess(user.labels)) {
    redirect("/login");
  }

  return { user: { ...user, role: pickRole(user.labels) }, tablesDB, storage, sessionSecret };
}

/** Sessão obrigatória — quando só o usuário importa, sem precisar do TablesDB. */
export async function requireUser(): Promise<RelgovUser> {
  const { user } = await requireSession();
  return user;
}

/** Sessão + papel obrigatórios — 1e/1i/etc. chamam isso para checar RBAC no servidor. */
export async function requireRole(...roles: RelgovRole[]): Promise<RelgovSession> {
  const session = await requireSession();
  if (!roles.includes(session.user.role as RelgovRole)) {
    redirect("/painel?erro=sem-permissao");
  }
  return session;
}

/**
 * Confere um segredo de rota de sincronização externa (SIORG/Senado/etc.) em
 * tempo constante — evita o timing side-channel de um `===` simples num
 * endpoint que a proxy.ts deixa passar sem sessão. Só aceita o header (não
 * query string, que vaza para logs de acesso/CDN).
 */
export function verificarSegredoSync(header: string | null, esperado: string | undefined): boolean {
  if (!esperado || !header) return false;
  const a = Buffer.from(header);
  const b = Buffer.from(esperado);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
