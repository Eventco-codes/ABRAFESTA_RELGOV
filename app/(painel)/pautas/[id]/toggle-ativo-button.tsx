"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { toggleAtivoPauta } from "../actions";

export function ToggleAtivoButton({
  pautaId,
  ativo,
}: {
  pautaId: string;
  ativo: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await toggleAtivoPauta(pautaId, !ativo);
          router.refresh();
        })
      }
      className="rounded-[7px] border border-white/30 bg-transparent px-3.5 py-2 text-[13px] font-medium text-white transition-colors hover:bg-white/10 disabled:opacity-60"
    >
      {pending ? "…" : ativo ? "Desativar" : "Reativar"}
    </button>
  );
}
