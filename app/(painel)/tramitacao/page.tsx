import Link from "next/link";

import { PageHeader } from "@/components/relgov/page-header";
import { requireSession } from "@/lib/auth";
import { canRegistrarMovimentacao, canRodarMonitoramento } from "@/lib/permissions";
import { anexoHref } from "@/lib/relgov/anexos";
import { listAnexosPorMovimentacoes, listMovimentacoesRecentes, listPautas } from "@/lib/relgov/data";
import { formatDateBR } from "@/lib/relgov/derived";
import { eixosDisponiveis, filtrarMovimentacoes, pautasLegislativas } from "@/lib/relgov/filters";
import { AnexarMovimentacaoForm } from "./anexar-movimentacao-form";
import { AtualizarTramitacaoButton } from "./atualizar-button";
import { CriarMovimentacaoForm } from "./criar-movimentacao-form";
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
  const { user, tablesDB } = await requireSession();
  const todasPautas = await listPautas(tablesDB);

  // Tramitação só mostra projetos de lei, decretos, PECs e normativas —
  // pautas de acompanhamento institucional continuam em /pautas. Filtra na
  // própria query, para o corte de 200 registros não cair numa página cheia
  // de movimentações institucionais e esconder tramitação legislativa real.
  const pautas = pautasLegislativas(todasPautas);
  const pautaIdsLegislativos = pautas.map((p) => p.$id);
  const movimentacoesLegislativas =
    pautaIdsLegislativos.length > 0
      ? await listMovimentacoesRecentes(tablesDB, 200, pautaIdsLegislativos)
      : [];
  const tituloPorPauta = new Map(pautas.map((p) => [p.$id, p.titulo]));
  const linkPorPauta = new Map(pautas.map((p) => [p.$id, p.linkOficial]));
  const pautaPorId = new Map(pautas.map((p) => [p.$id, p]));

  const movimentacoes = filtrarMovimentacoes(movimentacoesLegislativas, pautas, {
    pautaId: params.pautaId,
    eixo: params.eixo,
    origem: params.origem,
  });

  const anexos = await listAnexosPorMovimentacoes(
    tablesDB,
    movimentacoes.map((m) => m.$id)
  );
  const anexosDaMov = (movimentacaoId: string) =>
    anexos.filter((a) => a.movimentacaoId === movimentacaoId);
  const podeAnexar = canRegistrarMovimentacao(user.role);
  const podeCriar = canRegistrarMovimentacao(user.role);

  return (
    <div>
      <PageHeader
        title="Tramitação"
        subtitle="Projetos de lei, decretos e normativas em tramitação nos governos federal e estadual — monitorados semanalmente ou por registro manual quando necessário."
        actions={
          podeCriar || canRodarMonitoramento(user.role) ? (
            <>
              {podeCriar && (
                <CriarMovimentacaoForm
                  pautas={pautas
                    .map((p) => ({ id: p.$id, titulo: p.titulo }))
                    .sort((a, b) => a.titulo.localeCompare(b.titulo))}
                />
              )}
              {canRodarMonitoramento(user.role) && <AtualizarTramitacaoButton />}
            </>
          ) : undefined
        }
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
              {movimentacoesLegislativas.length === 0
                ? "Nenhuma movimentação registrada ainda para instrumentos legislativos."
                : "Nenhuma movimentação encontrada para esse filtro."}
            </p>
          )}
          {movimentacoes.map((mov, indice) => {
            const linkOficial = linkPorPauta.get(mov.pautaId);
            const pautaDaMov = pautaPorId.get(mov.pautaId);
            const temIdentificacao =
              pautaDaMov?.autor || pautaDaMov?.dataApresentacao || pautaDaMov?.ementa;
            return (
              <li
                key={mov.$id}
                className={`relative rounded-[9px] px-4 py-3.5 ${
                  indice % 2 === 0 ? "bg-relgov-surface" : "bg-relgov-navy/[0.045]"
                }`}
              >
                <span
                  className={`absolute -left-[23px] top-4 h-2.5 w-2.5 rounded-full border-2 border-relgov-bg ${
                    mov.origem === "VARREDURA_AUTOMATICA" ? "bg-relgov-gold" : "bg-relgov-navy"
                  }`}
                />
                <p className="font-mono text-[11px] text-relgov-muted">
                  {formatDateBR(mov.data)} · {ORIGEM_LABEL[mov.origem]}
                </p>
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <Link
                    href={`/pautas/${mov.pautaId}`}
                    className="text-[14px] font-semibold text-relgov-navy hover:underline"
                  >
                    {tituloPorPauta.get(mov.pautaId) ?? "Pauta"}
                  </Link>
                  {linkOficial && (
                    <a
                      href={linkOficial}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-relgov-navy-light underline"
                    >
                      Ver tramitação oficial ↗
                    </a>
                  )}
                </div>
                {temIdentificacao && (
                  <div className="mt-1 rounded-[7px] bg-relgov-surface-subtle px-2.5 py-2 text-[11.5px] text-relgov-secondary">
                    <p className="relgov-label text-[9.5px] text-relgov-label">
                      Identificação da Proposição
                    </p>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5">
                      {pautaDaMov?.autor && <span>Autor: {pautaDaMov.autor}</span>}
                      {pautaDaMov?.dataApresentacao && (
                        <span>Apresentação: {formatDateBR(pautaDaMov.dataApresentacao)}</span>
                      )}
                      {pautaDaMov?.dataUltimaMovimentacao && (
                        <span>
                          <strong className="font-semibold text-relgov-body">Última movimentação:</strong>{" "}
                          {formatDateBR(pautaDaMov.dataUltimaMovimentacao)}
                        </span>
                      )}
                    </div>
                    {pautaDaMov?.ementa && (
                      <p className="mt-1 leading-relaxed">Ementa: {pautaDaMov.ementa}</p>
                    )}
                  </div>
                )}
                <p className="mt-1.5 text-[13px] font-medium text-relgov-body">{mov.titulo}</p>
                <p className="text-[12.5px] leading-relaxed text-relgov-secondary">
                  {mov.descricao}
                </p>
                {anexosDaMov(mov.$id).map((anexo) => (
                  <a
                    key={anexo.$id}
                    href={anexoHref(anexo)}
                    className="mt-1 flex items-center gap-1 text-[11px] text-relgov-navy-light hover:underline"
                  >
                    <span aria-hidden>📎</span> {anexo.nome}
                  </a>
                ))}
                {podeAnexar && (
                  <AnexarMovimentacaoForm pautaId={mov.pautaId} movimentacaoId={mov.$id} />
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
