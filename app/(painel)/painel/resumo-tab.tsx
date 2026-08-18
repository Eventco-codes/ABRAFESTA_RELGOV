import { StatusTag } from "@/components/relgov/tags";
import { formatDateBR } from "@/lib/relgov/derived";
import type { Pauta, Pendencia, ResumoSemanal } from "@/lib/types";
import { EnviarResumoButton } from "./painel-client";

const CRITICIDADE_BORDA: Record<Pauta["prioridade"], string> = {
  Alta: "border-l-relgov-danger",
  Media: "border-l-relgov-warning",
  Baixa: "border-l-relgov-navy",
};

interface ResumoTabProps {
  resumo: ResumoSemanal | null;
  pautasComMovimentacao: Pauta[];
  numeroSemana: number;
  numeros: {
    pautasAtivas: number;
    comMovimentacao: number;
    pendenciasAbertas: number;
    prazosVencidos: number;
  };
  cobrarEstaSemana: Pendencia[];
  canManage: boolean;
}

export function ResumoTab({
  resumo,
  pautasComMovimentacao,
  numeroSemana,
  numeros,
  cobrarEstaSemana,
  canManage,
}: ResumoTabProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px]">
      <div className="px-7 py-6">
        {resumo ? (
          <>
            <p className="relgov-label text-[10px] text-relgov-gold">
              Semana {numeroSemana} · {formatDateBR(resumo.semanaInicio)}—
              {formatDateBR(resumo.semanaFim)}
            </p>
            <h2 className="mt-2 max-w-[600px] font-display text-[31px] font-semibold leading-[1.15] text-relgov-navy">
              {resumo.manchete}
            </h2>
            <p className="mt-3 max-w-[640px] text-sm leading-relaxed text-relgov-secondary">
              {resumo.lide}
            </p>

            <div className="mt-[22px] flex flex-col gap-[13px]">
              {pautasComMovimentacao.length === 0 && (
                <p className="text-sm text-relgov-muted">
                  Nenhuma pauta com movimentação registrada nesta semana.
                </p>
              )}
              {pautasComMovimentacao.map((pauta) => (
                <div
                  key={pauta.$id}
                  className={`rounded-lg border border-relgov-border border-l-[3px] bg-relgov-surface px-[17px] py-[15px] ${CRITICIDADE_BORDA[pauta.prioridade]}`}
                >
                  <div className="flex items-center gap-2.5">
                    <h3 className="font-display text-[15px] font-semibold text-relgov-navy">
                      {pauta.titulo}
                    </h3>
                    <StatusTag status={pauta.status} />
                  </div>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-relgov-secondary">
                    {pauta.situacaoAtual}
                  </p>
                  <p className="mt-2 text-[11.5px] text-relgov-muted">
                    {pauta.interlocutores}
                  </p>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="rounded-lg border border-dashed border-relgov-border p-8 text-center">
            <p className="text-sm text-relgov-muted">
              Nenhum monitoramento rodado ainda nesta semana. Clique em &ldquo;Rodar
              monitoramento&rdquo; para gerar o resumo.
            </p>
          </div>
        )}
      </div>

      <aside className="border-t border-relgov-border bg-relgov-surface px-[22px] py-6 lg:border-l lg:border-t-0">
        <p className="relgov-label text-[10px]">Números da semana</p>
        <dl className="mt-2">
          <NumeroRow label="Pautas ativas" valor={numeros.pautasAtivas} />
          <NumeroRow label="Com movimentação" valor={numeros.comMovimentacao} />
          <NumeroRow label="Pendências abertas" valor={numeros.pendenciasAbertas} />
          <NumeroRow label="Prazos vencidos" valor={numeros.prazosVencidos} danger />
        </dl>

        {cobrarEstaSemana.length > 0 && (
          <>
            <p className="relgov-label mt-6 text-[10px]">Cobrar esta semana</p>
            <div className="mt-2 flex flex-col gap-2">
              {cobrarEstaSemana.map((p) => (
                <div
                  key={p.$id}
                  className="rounded-[7px] border border-relgov-border bg-relgov-surface-subtle px-3 py-2.5"
                >
                  <p className="text-[12.5px] font-medium text-relgov-body">
                    {p.descricao}
                  </p>
                  <p className="text-[11.5px] text-relgov-danger">
                    prazo {formatDateBR(p.prazoSugerido)} · em atraso
                  </p>
                </div>
              ))}
            </div>
          </>
        )}

        {canManage && (
          <div className="mt-6">
            <EnviarResumoButton />
          </div>
        )}
      </aside>
    </div>
  );
}

function NumeroRow({
  label,
  valor,
  danger,
}: {
  label: string;
  valor: number;
  danger?: boolean;
}) {
  return (
    <div className="flex items-center justify-between border-b border-relgov-divider py-2.5">
      <dt className="text-[13px] text-relgov-secondary">{label}</dt>
      <dd
        className={`font-display text-[17px] font-semibold ${danger ? "text-relgov-danger" : "text-relgov-navy"}`}
      >
        {valor}
      </dd>
    </div>
  );
}
