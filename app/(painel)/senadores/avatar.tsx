"use client";

import { useState } from "react";

export function Avatar({ nome, urlFoto }: { nome: string; urlFoto: string | null }) {
  const [falhou, setFalhou] = useState(false);

  if (urlFoto && !falhou) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- foto externa (senado.leg.br), sem otimização do next/image
      <img
        src={urlFoto}
        alt={nome}
        className="h-9 w-9 shrink-0 rounded-full object-cover"
        loading="lazy"
        onError={() => setFalhou(true)}
      />
    );
  }
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-relgov-navy-light text-xs font-semibold text-relgov-gold">
      {nome.charAt(0).toUpperCase()}
    </span>
  );
}
