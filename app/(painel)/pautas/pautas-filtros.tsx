"use client";

import { useRouter } from "next/navigation";
import { useRef } from "react";

interface PautasFiltrosProps {
  eixos: string[];
  statuses: string[];
  defaults: {
    busca?: string;
    prioridade?: string;
    eixo?: string;
    status?: string;
    ativas?: string;
  };
}

const selectClass =
  "rounded-[7px] border border-relgov-border-control bg-relgov-surface px-3 py-2.5 text-[13px] text-relgov-body outline-none";

export function PautasFiltros({ eixos, statuses, defaults }: PautasFiltrosProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  function submit() {
    if (!formRef.current) return;
    const formData = new FormData(formRef.current);
    const params = new URLSearchParams();
    for (const [key, value] of formData.entries()) {
      if (typeof value === "string" && value) params.set(key, value);
    }
    router.push(`/pautas?${params.toString()}`);
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
        placeholder="Buscar por título, eixo, interlocutor…"
        className={`min-w-[260px] flex-1 ${selectClass}`}
        onChange={submit}
      />
      <select name="prioridade" defaultValue={defaults.prioridade ?? ""} className={selectClass} onChange={submit}>
        <option value="">Prioridade</option>
        <option value="Alta">Alta</option>
        <option value="Media">Média</option>
        <option value="Baixa">Baixa</option>
      </select>
      <select name="eixo" defaultValue={defaults.eixo ?? ""} className={selectClass} onChange={submit}>
        <option value="">Eixo</option>
        {eixos.map((eixo) => (
          <option key={eixo} value={eixo}>
            {eixo}
          </option>
        ))}
      </select>
      <select name="status" defaultValue={defaults.status ?? ""} className={selectClass} onChange={submit}>
        <option value="">Status</option>
        {statuses.map((status) => (
          <option key={status} value={status}>
            {status}
          </option>
        ))}
      </select>
      <select name="ativas" defaultValue={defaults.ativas ?? "ativas"} className={selectClass} onChange={submit}>
        <option value="ativas">Ativas</option>
        <option value="desativadas">Desativadas</option>
        <option value="todas">Todas</option>
      </select>
    </form>
  );
}
