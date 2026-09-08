"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { excluirPautaAgora } from "../actions";

export function ExcluirAgoraButton({ pautaId, titulo }: { pautaId: string; titulo: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        const confirmado = window.confirm(
          `Excluir "${titulo}" definitivamente agora?\n\nNão espera os 30 dias — apaga já do banco, junto com histórico de tramitação e documentos anexados. Não tem como desfazer.`
        );
        if (!confirmado) return;
        startTransition(async () => {
          await excluirPautaAgora(pautaId);
          router.refresh();
        });
      }}
      className="rounded-[7px] border border-relgov-danger-border bg-relgov-danger-bg px-3.5 py-2.5 text-[13px] font-medium text-relgov-danger transition-colors hover:opacity-80 disabled:opacity-60"
    >
      {pending ? "Excluindo…" : "Excluir definitivamente"}
    </button>
  );
}
