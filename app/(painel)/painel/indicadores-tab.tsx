import Link from "next/link";

import { InternaBadge, VencidoBadge } from "@/components/relgov/tags";
import { formatDateBR, isVencido } from "@/lib/relgov/derived";
import type { Pendencia } from "@/lib/types";

interface IndicadoresTabProps {
  kpis: {
    pautasAtivas: number;
    pautasNovas2026: number;
    prioridadeAlta: number;
    percentualAlta: number;
    pendenciasAbertas: number;
    pendenciasExternas: number;
    pendenciasInternas: number;
    prazosVencidos: number;
  };
  distribuicaoEixo: { eixo: string; total: number }[];
  cobrancasSugeridas: Pendencia[];
  proximaExecucao: string;
}

const BAR_COLOR = ["bg-relgov-navy", "bg-relgov-navy", "bg-relgov-navy-light", "bg-relgov-navy-light", "bg-relgov-label"];

export function IndicadoresTab({
  kpis,
  distribuicaoEixo,
  cobrancasSugeridas,
  proximaExecucao,
}: IndicadoresTabProps) {
  const maxTotal = Math.max(...distribuicaoEixo.map((d) => d.total), 1);

  return (
    <div className="px-7 py-[22px]">
      <div className="grid grid-cols-2 gap-3.5 md:grid-cols-4">
        <KpiCard label="Pautas ativas" valor={kpis.pautasAtivas} nota={`${kpis.pautasNovas2026} novas em 2026`} />
        <KpiCard
          label="Prioridade alta"
          valor={kpis.prioridadeAlta}
          nota={`${kpis.percentualAlta}% da carteira`}
        />
        <KpiCard
          label="Pendências abertas"
          valor={kpis.pendenciasAbertas}
          nota={`${kpis.pendenciasExternas} externas, ${kpis.pendenciasInternas} internas`}
        />
        <KpiCard
          label="Prazos vencidos"
          valor={kpis.prazosVencidos}
          nota="requer atenção"
          danger
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1.35fr_1fr]">
        <div className="rounded-[9px] border border-relgov-border bg-relgov-surface p-4">
          <p className="relgov-label text-[10px]">Pautas por eixo temático</p>
          <div className="mt-3 flex flex-col gap-2.5">
            {distribuicaoEixo.map((item, index) => (
              <div key={item.eixo} className="flex items-center gap-2.5">
                <span className="w-[150px] shrink-0 text-[12.5px] text-relgov-tag-blue-text">
                  {item.eixo}
                </span>
                <span className="h-[15px] flex-1 overflow-hidden rounded-[4px] bg-relgov-divider">
                  <span
                    className={`block h-full rounded-[4px] ${
                      item.eixo === "Outros eixos" ? "bg-relgov-gold" : BAR_COLOR[index] ?? "bg-relgov-label"
                    }`}
                    style={{ width: `${Math.max((item.total / maxTotal) * 100, 6)}%` }}
                  />
                </span>
                <span className="w-[22px] shrink-0 text-right font-mono text-[12px] text-relgov-muted">
                  {item.total}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[9px] border border-relgov-border bg-relgov-surface p-4">
          <div className="flex items-center justify-between">
            <p className="relgov-label text-[10px]">Cobranças sugeridas hoje</p>
            <Link href="/pendencias" className="text-[11.5px] font-medium text-relgov-navy-light">
              ver todas
            </Link>
          </div>
          <div className="mt-3 flex flex-col gap-2.5">
            {cobrancasSugeridas.length === 0 && (
              <p className="text-[12.5px] text-relgov-muted">Sem cobranças pendentes hoje.</p>
            )}
            {cobrancasSugeridas.map((p) => (
              <div key={p.$id} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[12.8px] font-medium text-relgov-body">
                    {p.descricao}
                  </p>
                  <p className="truncate text-[11.5px] text-relgov-muted">
                    prazo {formatDateBR(p.prazoSugerido)} · {p.responsavel}
                  </p>
                </div>
                {isVencido(p) ? <VencidoBadge /> : <InternaBadge />}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[9px] bg-relgov-navy p-[18px] px-5">
        <div className="max-w-[640px]">
          <p className="text-[13.5px] font-semibold text-relgov-gold">
            Varredura semanal automática
          </p>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-white/72">
            Toda segunda às 06:00, o RelGov recalcula prazos vencidos e prepara o
            resumo semanal a partir das pautas e pendências cadastradas.
          </p>
        </div>
        <div className="text-right">
          <p className="relgov-label text-[10px] text-white/50">Próxima execução</p>
          <p className="text-[15px] font-semibold text-white">{proximaExecucao}</p>
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  valor,
  nota,
  danger,
}: {
  label: string;
  valor: number;
  nota: string;
  danger?: boolean;
}) {
  return (
    <div
      className={`rounded-[9px] border bg-relgov-surface p-4 ${danger ? "border-relgov-danger" : "border-relgov-border"}`}
    >
      <p className={`relgov-label text-[10px] ${danger ? "text-relgov-danger" : ""}`}>{label}</p>
      <p
        className={`mt-1 font-display text-[30px] font-semibold ${danger ? "text-relgov-danger" : "text-relgov-navy"}`}
      >
        {valor}
      </p>
      <p className={`mt-0.5 text-[11.5px] ${danger ? "text-relgov-danger" : "text-relgov-muted"}`}>
        {nota}
      </p>
    </div>
  );
}
