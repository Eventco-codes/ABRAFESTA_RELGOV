import type { Prioridade } from "@/lib/types";

const PRIORIDADE_STYLE: Record<Prioridade, string> = {
  Alta: "bg-relgov-danger text-white",
  Media: "bg-relgov-warning text-white",
  Baixa: "bg-relgov-label text-white",
};

export function PrioridadePill({ prioridade }: { prioridade: Prioridade }) {
  return (
    <span
      className={`inline-block rounded-[10px] px-2 py-0.5 font-mono text-[10px] font-semibold uppercase ${PRIORIDADE_STYLE[prioridade]}`}
    >
      {prioridade === "Media" ? "Média" : prioridade}
    </span>
  );
}

function statusStyle(status: string): string {
  const s = status.toLowerCase();
  if (s.includes("nova")) return "bg-relgov-success-bg text-relgov-success";
  if (s.includes("atualizado")) return "bg-relgov-warning-bg text-relgov-warning-text";
  return "bg-relgov-tag-blue-bg text-relgov-tag-blue-text";
}

export function StatusTag({ status }: { status: string }) {
  return (
    <span
      className={`inline-block rounded-[5px] px-2 py-0.5 text-[11px] font-medium ${statusStyle(status)}`}
    >
      {status}
    </span>
  );
}

export function VencidoBadge() {
  return (
    <span className="inline-block rounded-[10px] bg-relgov-danger px-2 py-0.5 font-mono text-[10px] font-semibold text-white">
      VENCIDO
    </span>
  );
}

export function InternaBadge() {
  return (
    <span className="inline-block rounded-[10px] bg-relgov-warning px-2 py-0.5 font-mono text-[10px] font-semibold text-white">
      INTERNA
    </span>
  );
}
