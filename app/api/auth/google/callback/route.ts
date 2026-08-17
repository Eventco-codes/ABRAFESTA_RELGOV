import { NextRequest, NextResponse } from "next/server";

import { createAnonClient, createSessionClient } from "@/lib/appwrite/server";
import { SESSION_COOKIE_NAME, hasRelgovAccess } from "@/lib/appwrite/constants";

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const userId = request.nextUrl.searchParams.get("userId");
  const secret = request.nextUrl.searchParams.get("secret");

  if (!userId || !secret) {
    return NextResponse.redirect(`${origin}/login?erro=oauth`);
  }

  const { account } = createAnonClient();
  const session = await account.createSession({ userId, secret });

  const { account: sessionAccount } = createSessionClient(session.secret);
  const user = await sessionAccount.get();

  if (!hasRelgovAccess(user.labels)) {
    await sessionAccount.deleteSession({ sessionId: "current" });
    return NextResponse.redirect(`${origin}/login?erro=sem-convite`);
  }

  const response = NextResponse.redirect(`${origin}/painel`);
  response.cookies.set(SESSION_COOKIE_NAME, session.secret, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(session.expire),
  });
  return response;
}
