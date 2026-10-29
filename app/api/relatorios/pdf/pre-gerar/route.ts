// Geração agendada do relatório em PDF. Protegida por segredo (header), como as rotas de sync.
//   GET|POST /api/relatorios/pdf/pre-gerar
//
// Header:  x-pdf-cron-secret: $PDF_CRON_SECRET
// (só o header — segredo em query string vaza para logs de acesso)
//
// Chamada por um agendador (cron do cPanel) de madrugada: o PDF do dia (completo e só prioridade
// alta) fica pronto no cache e o primeiro download do dia deixa de custar dezenas de segundos de CPU
// na hospedagem compartilhada. Responde 202 NA HORA — a geração segue em segundo plano, então o
// cron não depende do tempo limite da hospedagem nem fica segurando processo.

import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/lib/appwrite/server";
import { verificarSegredoSync } from "@/lib/auth";
import { carregarDadosRelatorio } from "@/lib/relgov/relatorio-pdf-dados";
import { EMITENTE_AUTOMATICO, preGerarRelatorioPdf } from "@/lib/relgov/relatorio-pdf-cache";

export const dynamic = "force-dynamic";

async function handle(req: NextRequest) {
  const esperado = process.env.PDF_CRON_SECRET;
  if (!esperado || esperado.length < 16) {
    return NextResponse.json({ erro: "PDF_CRON_SECRET não configurado (mínimo de 16 caracteres)." }, { status: 503 });
  }
  if (!verificarSegredoSync(req.headers.get("x-pdf-cron-secret"), esperado)) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
  }

  try {
    const { tablesDB } = createAdminClient();
    const geradoEm = new Date();

    // Carrega os dois escopos ANTES de iniciar qualquer geração: gerar o PDF ocupa o único núcleo
    // da hospedagem por dezenas de segundos e seguraria a leitura do segundo escopo (e a resposta).
    const escopos = [false, true] as const;
    const dados = await Promise.all(escopos.map((apenasAlta) => carregarDadosRelatorio(tablesDB, apenasAlta)));

    const situacao: Record<string, string> = {};
    for (const [i, apenasAlta] of escopos.entries()) {
      situacao[apenasAlta ? "apenasAlta" : "completo"] = await preGerarRelatorioPdf({
        ...dados[i],
        geradoEm,
        apenasAlta,
        emitidoPor: EMITENTE_AUTOMATICO,
      });
    }
    return NextResponse.json({ ok: true, situacao }, { status: 202 });
  } catch (err) {
    return NextResponse.json({ erro: "Falha ao preparar o relatório", detalhe: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return handle(req);
}

// GET permitido para agendadores que só fazem GET (curl simples); mesma proteção.
export async function GET(req: NextRequest) {
  return handle(req);
}
