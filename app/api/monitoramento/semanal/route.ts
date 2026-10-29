// Varredura semanal automática do RelGov. Protegida por segredo (header), como as rotas de sync.
//   GET|POST /api/monitoramento/semanal
//
// Header:  x-monitoramento-secret: $MONITORAMENTO_CRON_SECRET
// (só o header — segredo em query string vaza para logs de acesso)
//
// Chamada por um agendador (cron do cPanel) toda segunda às 06:00. Faz o mesmo que os botões
// "Atualizar" (Tramitação) e "Rodar monitoramento" (Painel), sem sessão de usuário:
//   1) consulta a API da Câmara para cada pauta em Tramitação com link oficial da Câmara e grava as
//      novidades como movimentação com origem VARREDURA_AUTOMATICA;
//   2) garante o resumo da semana corrente (o painel mostra "última varredura em …" a partir dele).
// Responde só depois de terminar, com o resumo do que foi feito — o cron deve usar `curl -m 300`.

import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/lib/appwrite/server";
import { verificarSegredoSync } from "@/lib/auth";
import { atualizarTramitacaoViaCamara } from "@/lib/camara/refresh";
import { listPautas } from "@/lib/relgov/data";
import { pautasLegislativas } from "@/lib/relgov/filters";
import { garantirResumoDaSemana } from "@/lib/relgov/resumo-semanal";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

const EXECUTOR = "Varredura automática";

async function handle(req: NextRequest) {
  const esperado = process.env.MONITORAMENTO_CRON_SECRET;
  if (!esperado || esperado.length < 16) {
    return NextResponse.json(
      { erro: "MONITORAMENTO_CRON_SECRET não configurado (mínimo de 16 caracteres)." },
      { status: 503 }
    );
  }
  if (!verificarSegredoSync(req.headers.get("x-monitoramento-secret"), esperado)) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
  }

  try {
    const { tablesDB } = createAdminClient();
    const pautas = pautasLegislativas(await listPautas(tablesDB));
    const tramitacao = await atualizarTramitacaoViaCamara(tablesDB, pautas, EXECUTOR);
    const resumo = await garantirResumoDaSemana(tablesDB);

    const falhas = tramitacao.detalhes.filter((d) => !d.atualizado && d.motivo?.startsWith("Falha")).length;
    return NextResponse.json(
      {
        ok: true,
        tramitacao: {
          verificadas: tramitacao.verificadas,
          atualizadas: tramitacao.atualizadas,
          semLinkCamara: tramitacao.semLinkCamara,
          falhasNaApiDaCamara: falhas,
        },
        resumoDaSemana: { semanaInicio: resumo.semanaInicio, semanaFim: resumo.semanaFim },
      },
      // 207: rodou, mas parte das consultas à Câmara falhou (o cron enxerga no código HTTP).
      { status: falhas > 0 ? 207 : 200 }
    );
  } catch (err) {
    return NextResponse.json({ erro: "Falha na varredura semanal", detalhe: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return handle(req);
}

// GET permitido para agendadores que só fazem GET (curl simples); mesma proteção.
export async function GET(req: NextRequest) {
  return handle(req);
}
