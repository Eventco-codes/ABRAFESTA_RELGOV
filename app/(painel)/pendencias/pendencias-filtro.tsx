"use client";

export function PendenciasFiltro({ defaultValue }: { defaultValue: string }) {
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
    </form>
  );
}
