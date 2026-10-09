// src/app/api/siorg/sync/route.ts
// Dispara a sincronização SIORG. Protegida por segredo (header).
//   POST /api/siorg/sync?mode=full   -> carga completa
//   POST /api/siorg/sync?mode=delta  -> sincronização incremental
//
// Header:  x-siorg-sync-secret: $SIORG_SYNC_SECRET
// (só o header — segredo em query string vaza para logs de acesso/CDN)

import { NextRequest, NextResponse } from "next/server";
import { verificarSegredoSync } from "@/lib/auth";
import { fullSync, deltaSync, adminDb, syncEnderecosOrgaos } from "@/lib/siorg/sync";

// SIORG é lento (335+ órgãos, árvores grandes, retries). Sem limite curto.
export const maxDuration = 300;
export const dynamic = "force-dynamic";

function autorizado(req: NextRequest): boolean {
  return verificarSegredoSync(req.headers.get("x-siorg-sync-secret"), process.env.SIORG_SYNC_SECRET);
}

async function handle(req: NextRequest) {
  if (!autorizado(req)) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
  }

  const mode = (req.nextUrl.searchParams.get("mode") ?? "delta").toLowerCase();
  if (mode !== "full" && mode !== "delta" && mode !== "enderecos") {
    return NextResponse.json({ erro: "mode deve ser 'full', 'delta' ou 'enderecos'" }, { status: 400 });
  }

  try {
    if (mode === "enderecos") {
      const etapa = await syncEnderecosOrgaos(adminDb());
      return NextResponse.json(
        { modo: "enderecos", etapas: [etapa] },
        { status: etapa.status === "erro" ? 207 : 200 },
      );
    }
    const resultado = mode === "full" ? await fullSync() : await deltaSync();
    const houveErro = resultado.etapas.some((e) => e.status === "erro");
    return NextResponse.json(resultado, { status: houveErro ? 207 : 200 });
  } catch (err) {
    return NextResponse.json(
      { erro: "Falha na sincronização", detalhe: String(err) },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  return handle(req);
}

// GET permitido só para agendadores que não fazem POST; mesma proteção.
export async function GET(req: NextRequest) {
  return handle(req);
}
