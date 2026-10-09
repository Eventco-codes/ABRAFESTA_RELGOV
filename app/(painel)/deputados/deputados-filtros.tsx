"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useRef } from "react";

interface DeputadosFiltrosProps {
  partidos: string[];
  ufs: string[];
  defaults: {
    busca?: string;
    partido?: string;
    uf?: string;
  };
}

const selectClass =
  "rounded-[7px] border border-relgov-border-control bg-relgov-surface px-3 py-2.5 text-[13px] text-relgov-body outline-none";

export function DeputadosFiltros({ partidos, ufs, defaults }: DeputadosFiltrosProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const formRef = useRef<HTMLFormElement>(null);

  function submit() {
    if (!formRef.current) return;
    const formData = new FormData(formRef.current);
    const params = new URLSearchParams();
    for (const [key, value] of formData.entries()) {
      if (typeof value === "string" && value) params.set(key, value);
    }
    // Preserva a ordenação atual (não é um campo deste formulário) — só o
    // filtro muda; o critério de ordenação escolhido pelo usuário continua.
    const ordenar = searchParams.get("ordenar");
    if (ordenar) params.set("ordenar", ordenar);
    router.push(`/deputados?${params.toString()}`);
  }

  return (
    <form
      ref={formRef}
      className="my-4 flex flex-wrap gap-2.5"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <input
        type="search"
        name="busca"
        defaultValue={defaults.busca}
        placeholder="Buscar por nome…"
        className={`min-w-[260px] flex-1 ${selectClass}`}
        onChange={submit}
      />
      <select name="partido" defaultValue={defaults.partido ?? ""} className={selectClass} onChange={submit}>
        <option value="">Partido</option>
        {partidos.map((partido) => (
          <option key={partido} value={partido}>
            {partido}
          </option>
        ))}
      </select>
      <select name="uf" defaultValue={defaults.uf ?? ""} className={selectClass} onChange={submit}>
        <option value="">UF</option>
        {ufs.map((uf) => (
          <option key={uf} value={uf}>
            {uf}
          </option>
        ))}
      </select>
    </form>
  );
}
