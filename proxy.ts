import { NextRequest, NextResponse } from "next/server";

import { SESSION_COOKIE_NAME } from "@/lib/appwrite/constants";

// /api/siorg/sync, /api/senado/sync e /api/relatorios/pdf/pre-gerar têm autenticação própria
// por segredo (x-siorg-sync-secret / x-senado-sync-secret / x-pdf-cron-secret) — chamadas por
// agendadores, sem cookie de sessão do RelGov. Só essas rotas ficam públicas — qualquer outra
// rota futura sob /api/siorg, /api/senado ou /api/relatorios deve continuar exigindo sessão
// por padrão (/api/relatorios/pdf, o download, exige).
const PUBLIC_PATHS = ["/login", "/api/auth", "/api/siorg/sync", "/api/senado/sync", "/api/relatorios/pdf/pre-gerar"];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

/**
 * Guarda rápida (sem chamar o Appwrite): só olha se existe cookie de sessão.
 * A validação de verdade (sessão válida + Label/RBAC) acontece em cada
 * página via requireUser()/requireRole() (lib/auth.ts) — este proxy só
 * evita a ida e volta de renderizar uma página protegida sem cookie algum.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.has(SESSION_COOKIE_NAME);

  if (isPublicPath(pathname)) {
    if (pathname === "/login" && hasSession) {
      return NextResponse.redirect(new URL("/painel", request.url));
    }
    return NextResponse.next();
  }

  if (!hasSession) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|abrafesta-logo.png).*)"],
};
