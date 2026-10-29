// app/api/senado/sync/route.ts
// Dispara a sincronização Senado. Protegida por segredo.
//   POST /api/senado/sync?mode=full        -> processos por sigla/ano (tramitando=S)
//   POST /api/senado/sync?mode=delta&dias=1 -> processos atualizados nos últimos N dias (máx. 30)
//   POST /api/senado/sync?mode=senadores    -> cadastro + contato dos senadores em exercício
//
// Header:  x-senado-sync-secret: $SENADO_SYNC_SECRET
// (só o header — segredo em query string vaza para logs de acesso/CDN)

import { NextRequest, NextResponse } from "next/server";
import { verificarSegredoSync } from "@/lib/auth";
import { fullSync, deltaSync, senadoresSync } from "@/lib/senado/sync";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

function autorizado(req: NextRequest): boolean {
  return verificarSegredoSync(req.headers.get("x-senado-sync-secret"), process.env.SENADO_SYNC_SECRET);
}

async function handle(req: NextRequest) {
  if (!autorizado(req)) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
  }
  const mode = (req.nextUrl.searchParams.get("mode") ?? "delta").toLowerCase();
  if (mode !== "full" && mode !== "delta" && mode !== "senadores") {
    return NextResponse.json({ erro: "mode deve ser 'full', 'delta' ou 'senadores'" }, { status: 400 });
  }
  try {
    const resultado =
      mode === "full"
        ? await fullSync()
        : mode === "senadores"
          ? await senadoresSync()
          : await deltaSync(Number(req.nextUrl.searchParams.get("dias") ?? "1"));
    const houveErro = resultado.etapas.some((e) => e.status === "erro");
    return NextResponse.json(resultado, { status: houveErro ? 207 : 200 });
  } catch (err) {
    return NextResponse.json({ erro: "Falha na sincronização", detalhe: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return handle(req);
}
export async function GET(req: NextRequest) {
  return handle(req);
}
