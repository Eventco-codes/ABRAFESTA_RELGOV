"use client";

export function PendenciasFiltro({
  defaultValue,
  defaultOrdenar,
}: {
  defaultValue: string;
  defaultOrdenar: string;
}) {
  return (
    <form
      className="mb-4 flex items-center gap-2.5"
      onChange={(e) => e.currentTarget.requestSubmit()}
      action="/pendencias"
    >
      <select
        name="filtro"
        defaultValue={defaultValue}
        className="rounded-[7px] border border-relgov-border-control bg-relgov-surface px-3 py-2 text-[13px] text-relgov-body"
      >
        <option value="vencidas">Vencidas</option>
        <option value="abertas">Abertas</option>
        <option value="todas">Todas</option>
      </select>

      <select
        name="ordenar"
        defaultValue={defaultOrdenar}
        aria-label="Ordenar por"
        className="rounded-[7px] border border-relgov-border-control bg-relgov-surface px-3 py-2 text-[13px] text-relgov-body"
      >
        <option value="atraso">Ordenar: mais atrasadas primeiro</option>
        <option value="prazo">Ordenar: prazo mais próximo</option>
        <option value="prioridade">Ordenar: prioridade</option>
        <option value="responsavel">Ordenar: responsável (A–Z)</option>
        <option value="status">Ordenar: status (A–Z)</option>
      </select>
    </form>
  );
}
