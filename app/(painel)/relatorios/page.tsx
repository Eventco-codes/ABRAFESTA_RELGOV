import Image from "next/image";

import { PageHeader } from "@/components/relgov/page-header";
import { PrioridadePill, StatusTag } from "@/components/relgov/tags";
import { requireSession } from "@/lib/auth";
import { listPautas, listPendencias } from "@/lib/relgov/data";
import { formatDateLongBR, pautasAtivas } from "@/lib/relgov/derived";
import { FiltroPrioridade } from "./filtro-prioridade";
import { PrintButton } from "./print-button";

export default async function RelatoriosPage({
  searchParams,
}: {
  searchParams: Promise<{ apenasAlta?: string }>;
}) {
  const { apenasAlta } = await searchParams;
  const { tablesDB } = await requireSession();
  const [pautas, pendencias] = await Promise.all([listPautas(tablesDB), listPendencias(tablesDB)]);

  const ativas = pautasAtivas(pautas).sort((a, b) => a.titulo.localeCompare(b.titulo));
  const filtradas = apenasAlta === "1" ? ativas.filter((p) => p.prioridade === "Alta") : ativas;

  return (
    <div>
      <div className="print:hidden">
        <PageHeader
          title="Relatório exportável"
          subtitle={`${filtradas.length} pautas · gerado em ${formatDateLongBR(new Date().toISOString())}`}
          actions={
            <>
              <FiltroPrioridade defaultValue={apenasAlta ?? "0"} />
              <PrintButton />
            </>
          }
        />
      </div>

      <div className="mx-auto flex max-w-[820px] flex-col gap-6 px-7 py-8 print:max-w-none print:gap-0 print:px-0 print:py-0">
        <section className="break-after-page rounded-lg bg-relgov-navy p-9 text-white shadow-[0_3px_14px_rgba(0,0,0,.12)] print:rounded-none print:shadow-none">
          <Image
            src="/abrafesta-logo.png"
            alt="ABRAFESTA"
            width={168}
            height={52}
            className="h-auto w-[168px]"
          />
          <p className="relgov-label mt-3 text-[10px] text-white/60">Relações Governamentais</p>
          <h1 className="mt-4 font-display text-[27px] font-semibold leading-[1.25]">
            Relatório de acompanhamento legislativo
          </h1>
          <span className="mt-3 block h-[3px] w-14 bg-relgov-gold" />
          <p className="mt-3 text-[12.5px] text-white/70">
            Gerado em {formatDateLongBR(new Date().toISOString())}
          </p>

          <ol className="mt-8 flex flex-col gap-1.5">
            {filtradas.map((p, i) => (
              <li
                key={p.$id}
                className="flex items-baseline justify-between gap-2 border-b border-dotted border-white/20 pb-1 text-[12.5px]"
              >
                <span className="truncate text-white/85">{p.titulo}</span>
                <span className="font-mono text-white/50">{i + 2}</span>
              </li>
            ))}
          </ol>
        </section>

        {filtradas.map((pauta) => {
          const vinculadas = pendencias.filter((p) => p.pautaId === pauta.$id);
          return (
            <section
              key={pauta.$id}
              className="break-after-page rounded-lg border border-relgov-border bg-white p-9 shadow-[0_3px_14px_rgba(0,0,0,.12)] print:rounded-none print:border-0 print:shadow-none"
            >
              <p className="relgov-label text-[10px] text-relgov-gold">{pauta.eixo}</p>
              <h2 className="mt-1 font-display text-[19px] font-semibold leading-[1.3] text-relgov-navy">
                {pauta.titulo}
              </h2>
              <div className="mt-2 flex items-center gap-2">
                <PrioridadePill prioridade={pauta.prioridade} />
                <StatusTag status={pauta.status} />
              </div>

              <ReportBlock n={1} titulo="Atuação" texto={pauta.atuacao} />
              <ReportBlock n={2} titulo="Situação atual" texto={pauta.situacaoAtual} />
              <ReportBlock n={3} titulo="Interlocutores" texto={pauta.interlocutores} />
              <ReportBlock n={4} titulo="Próximos encaminhamentos" texto={pauta.contexto} />

              {vinculadas.length > 0 && (
                <div className="mt-4 rounded-md border-l-2 border-relgov-gold bg-relgov-surface-subtle p-3">
                  <p className="text-[11px] font-semibold text-relgov-navy">
                    Pendências vinculadas
                  </p>
                  <ul className="mt-1 list-disc pl-4 text-[11.5px] text-relgov-secondary">
                    {vinculadas.map((p) => (
                      <li key={p.$id}>{p.descricao}</li>
                    ))}
                  </ul>
                </div>
              )}

              <p className="mt-4 text-[10.5px] text-relgov-placeholder">
                Fonte: {pauta.fonteReferencia}
              </p>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function ReportBlock({ n, titulo, texto }: { n: number; titulo: string; texto: string }) {
  return (
    <div className="mt-3">
      <p className="text-[11px] font-semibold text-relgov-navy">
        {n}. {titulo}
      </p>
      <p className="mt-0.5 text-[11.8px] leading-relaxed text-relgov-dense-2">{texto}</p>
    </div>
  );
}
