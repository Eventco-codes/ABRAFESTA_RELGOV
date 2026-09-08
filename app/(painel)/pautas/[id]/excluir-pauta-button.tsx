"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { excluirPauta } from "../actions";

export function ExcluirPautaButton({ pautaId, titulo }: { pautaId: string; titulo: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        const confirmado = window.confirm(
          `Excluir "${titulo}"?\n\nA pauta some do painel imediatamente. Fica na lixeira por 30 dias (Pautas > Lixeira), com opção de restaurar — depois disso é apagada do banco em definitivo, junto com seu histórico de tramitação e documentos anexados.`
        );
        if (!confirmado) return;
        startTransition(async () => {
          await excluirPauta(pautaId);
          router.push("/pautas");
        });
      }}
      className="rounded-[7px] border border-white/30 bg-transparent px-3.5 py-2 text-[13px] font-medium text-relgov-danger transition-colors hover:bg-white/10 disabled:opacity-60"
    >
      {pending ? "Excluindo…" : "Excluir"}
    </button>
  );
}
