import { NextRequest, NextResponse } from "next/server";
import { OAuthProvider } from "node-appwrite";

import { createAnonClient } from "@/lib/appwrite/server";

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const { account } = createAnonClient();

  const redirectUrl = await account.createOAuth2Token({
    provider: OAuthProvider.Google,
    success: `${origin}/api/auth/google/callback`,
    failure: `${origin}/login?erro=oauth`,
  });

  return NextResponse.redirect(redirectUrl);
}
