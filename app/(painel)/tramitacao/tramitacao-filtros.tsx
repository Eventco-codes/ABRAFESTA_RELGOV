"use client";

import { useRouter } from "next/navigation";
import { useRef } from "react";

interface TramitacaoFiltrosProps {
  pautas: { id: string; titulo: string }[];
  eixos: string[];
  defaults: {
    pautaId?: string;
    eixo?: string;
    origem?: string;
  };
}

const selectClass =
  "rounded-[7px] border border-relgov-border-control bg-relgov-surface px-3 py-2.5 text-[13px] text-relgov-body outline-none";

export function TramitacaoFiltros({ pautas, eixos, defaults }: TramitacaoFiltrosProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  function submit() {
    if (!formRef.current) return;
    const formData = new FormData(formRef.current);
    const params = new URLSearchParams();
    for (const [key, value] of formData.entries()) {
      if (typeof value === "string" && value) params.set(key, value);
    }
    router.push(`/tramitacao?${params.toString()}`);
  }

  return (
    <form
      ref={formRef}
      className="mb-4 flex flex-wrap gap-2.5"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <select name="pautaId" defaultValue={defaults.pautaId ?? ""} className={selectClass} onChange={submit}>
        <option value="">Pauta</option>
        {pautas.map((pauta) => (
          <option key={pauta.id} value={pauta.id}>
            {pauta.titulo}
          </option>
        ))}
      </select>
      <select name="eixo" defaultValue={defaults.eixo ?? ""} className={selectClass} onChange={submit}>
        <option value="">Eixo</option>
        {eixos.map((eixo) => (
          <option key={eixo} value={eixo}>
            {eixo}
          </option>
        ))}
      </select>
      <select name="origem" defaultValue={defaults.origem ?? ""} className={selectClass} onChange={submit}>
        <option value="">Origem</option>
        <option value="VARREDURA_AUTOMATICA">Varredura automática</option>
        <option value="REGISTRO_MANUAL">Registro manual</option>
      </select>
    </form>
  );
}
