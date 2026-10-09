import { NextRequest } from "next/server";

import { requireSession } from "@/lib/auth";
import { listEncaminhamentosDePautas, listPautas, listPendencias } from "@/lib/relgov/data";
import { pautasAtivas } from "@/lib/relgov/derived";
import { gerarRelatorioPdf } from "@/lib/relgov/relatorio-pdf";

/** Relatório de acompanhamento em PDF (download). Mesmo recorte da página /relatorios. */
export async function GET(request: NextRequest) {
  const { tablesDB, user } = await requireSession();
  const apenasAlta = request.nextUrl.searchParams.get("apenasAlta") === "1";

  const [todasPautas, pendencias] = await Promise.all([listPautas(tablesDB), listPendencias(tablesDB)]);
  const ativas = pautasAtivas(todasPautas);
  const pautas = apenasAlta ? ativas.filter((p) => p.prioridade === "Alta") : ativas;
  const encaminhamentos = await listEncaminhamentosDePautas(
    tablesDB,
    pautas.map((p) => p.$id)
  );

  const geradoEm = new Date();
  const pdf = await gerarRelatorioPdf({
    pautas,
    encaminhamentos,
    pendencias,
    geradoEm,
    apenasAlta,
    emitidoPor: user.name || user.email,
  });

  const dia = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(geradoEm);
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="RelGov-ABRAFESTA-Relatorio-${dia}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
