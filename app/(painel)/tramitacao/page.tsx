import Link from "next/link";

import { PageHeader } from "@/components/relgov/page-header";
import { requireSession } from "@/lib/auth";
import { listMovimentacoesRecentes, listPautas } from "@/lib/relgov/data";
import { formatDateBR } from "@/lib/relgov/derived";
import { eixosDisponiveis, filtrarMovimentacoes } from "@/lib/relgov/filters";
import { TramitacaoFiltros } from "./tramitacao-filtros";

const ORIGEM_LABEL: Record<string, string> = {
  VARREDURA_AUTOMATICA: "Varredura automática",
  REGISTRO_MANUAL: "Registro manual",
};

export default async function TramitacaoPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const { tablesDB } = await requireSession();
  const [todasMovimentacoes, pautas] = await Promise.all([
    listMovimentacoesRecentes(tablesDB, 200),
    listPautas(tablesDB),
  ]);
  const tituloPorPauta = new Map(pautas.map((p) => [p.$id, p.titulo]));

  const movimentacoes = filtrarMovimentacoes(todasMovimentacoes, pautas, {
    pautaId: params.pautaId,
    eixo: params.eixo,
    origem: params.origem,
  });

  return (
    <div>
      <PageHeader
        title="Tramitação"
        subtitle="Últimas movimentações registradas em qualquer pauta, mais recentes primeiro."
      />
      <div className="px-7 py-6">
        <TramitacaoFiltros
          pautas={pautas
            .map((p) => ({ id: p.$id, titulo: p.titulo }))
            .sort((a, b) => a.titulo.localeCompare(b.titulo))}
          eixos={eixosDisponiveis(pautas)}
          defaults={params}
        />
        <ol className="flex flex-col gap-[18px] border-l border-relgov-divider pl-5">
          {movimentacoes.length === 0 && (
            <p className="text-sm text-relgov-muted">
              {todasMovimentacoes.length === 0
                ? "Nenhuma movimentação registrada ainda."
                : "Nenhuma movimentação encontrada para esse filtro."}
            </p>
          )}
          {movimentacoes.map((mov) => (
            <li key={mov.$id} className="relative">
              <span
                className={`absolute -left-[23px] top-1 h-2.5 w-2.5 rounded-full border-2 border-relgov-bg ${
                  mov.origem === "VARREDURA_AUTOMATICA" ? "bg-relgov-gold" : "bg-relgov-navy"
                }`}
              />
              <p className="font-mono text-[11px] text-relgov-muted">
                {formatDateBR(mov.data)} · {ORIGEM_LABEL[mov.origem]}
              </p>
              <Link
                href={`/pautas/${mov.pautaId}`}
                className="text-[14px] font-semibold text-relgov-navy hover:underline"
              >
                {tituloPorPauta.get(mov.pautaId) ?? "Pauta"}
              </Link>
              <p className="text-[13px] font-medium text-relgov-body">{mov.titulo}</p>
              <p className="text-[12.5px] leading-relaxed text-relgov-secondary">
                {mov.descricao}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
