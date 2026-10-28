import { NextRequest } from "next/server";

import { requireSession } from "@/lib/auth";
import { listEncaminhamentosDePautas, listPautas, listPendencias } from "@/lib/relgov/data";
import { pautasAtivas } from "@/lib/relgov/derived";
import { ultimaGeracao } from "@/lib/relgov/relatorio-pdf";
import { obterRelatorioPdf } from "@/lib/relgov/relatorio-pdf-cache";

/** Relatório de acompanhamento em PDF (download). Mesmo recorte da página /relatorios. */
export async function GET(request: NextRequest) {
  // Cronometragem por etapa (cabeçalho Server-Timing, visível só a quem está logado): mostra
  // onde o tempo vai na hospedagem compartilhada sem precisar de acesso aos logs do servidor.
  const inicio = performance.now();
  const marcas: string[] = [];
  const marcar = (nome: string) => marcas.push(`${nome};dur=${Math.round(performance.now() - inicio)}`);

  const { tablesDB, user } = await requireSession();
  marcar("sessao");
  const apenasAlta = request.nextUrl.searchParams.get("apenasAlta") === "1";

  const [todasPautas, pendencias] = await Promise.all([listPautas(tablesDB), listPendencias(tablesDB)]);
  const ativas = pautasAtivas(todasPautas);
  const pautas = apenasAlta ? ativas.filter((p) => p.prioridade === "Alta") : ativas;
  const encaminhamentos = await listEncaminhamentosDePautas(
    tablesDB,
    pautas.map((p) => p.$id)
  );
  marcar("dados");

  const geradoEm = new Date();
  const pdf = await obterRelatorioPdf({
    pautas,
    encaminhamentos,
    pendencias,
    geradoEm,
    apenasAlta,
    emitidoPor: user.name || user.email,
  });

  marcar("pdf");
  marcas.push(
    `fontes;dur=${ultimaGeracao.fontes}`,
    `passe1;dur=${ultimaGeracao.passe1}`,
    `passe2;dur=${ultimaGeracao.passe2}`
  );
  const dia = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(geradoEm);
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Server-Timing": marcas.join(", "),
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="RelGov-ABRAFESTA-Relatorio-${dia}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
