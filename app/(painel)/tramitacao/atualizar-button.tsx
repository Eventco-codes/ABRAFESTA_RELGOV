"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { PrimaryButton } from "@/components/relgov/buttons";
import { atualizarTramitacao } from "./actions";

export function AtualizarTramitacaoButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [resultado, setResultado] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  return (
    <div className="flex flex-col items-end gap-1.5">
      <PrimaryButton
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const res = await atualizarTramitacao();
            if (res.erro) {
              setResultado({ tipo: "erro", texto: res.erro });
            } else {
              setResultado({ tipo: "ok", texto: res.mensagem ?? "Atualizado." });
              router.refresh();
            }
          })
        }
      >
        {pending ? "Atualizando…" : "Atualizar"}
      </PrimaryButton>
      {resultado && (
        <p
          className={`max-w-[320px] text-right text-[11.5px] ${
            resultado.tipo === "erro" ? "text-relgov-danger" : "text-relgov-muted"
          }`}
        >
          {resultado.texto}
        </p>
      )}
    </div>
  );
}
