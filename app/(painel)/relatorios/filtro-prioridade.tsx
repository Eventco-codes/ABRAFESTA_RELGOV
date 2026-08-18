"use client";

export function FiltroPrioridade({ defaultValue }: { defaultValue: string }) {
  return (
    <form action="/relatorios" onChange={(e) => e.currentTarget.requestSubmit()}>
      <select
        name="apenasAlta"
        defaultValue={defaultValue}
        className="rounded-[7px] border border-relgov-border-control bg-relgov-surface px-3 py-2.5 text-[13px]"
      >
        <option value="0">Todas as prioridades</option>
        <option value="1">Somente prioridade alta</option>
      </select>
    </form>
  );
}
