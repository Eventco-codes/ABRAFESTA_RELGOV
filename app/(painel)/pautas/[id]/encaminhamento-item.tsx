"use client";

import { useTransition } from "react";

import type { Encaminhamento } from "@/lib/types";
import { toggleEncaminhamento } from "../actions";

export function EncaminhamentoItem({
  pautaId,
  encaminhamento,
  editable,
}: {
  pautaId: string;
  encaminhamento: Encaminhamento;
  editable: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <label className="flex items-start gap-2.5 py-1">
      <input
        type="checkbox"
        defaultChecked={encaminhamento.concluido}
        disabled={!editable || pending}
        onChange={(e) =>
          startTransition(() =>
            toggleEncaminhamento(pautaId, encaminhamento.$id, e.target.checked)
          )
        }
        className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded-[3px] border border-relgov-border-control accent-relgov-navy"
      />
      <span
        className={`text-[13px] leading-relaxed ${encaminhamento.concluido ? "text-relgov-muted line-through" : "text-relgov-body"}`}
      >
        {encaminhamento.texto}
      </span>
    </label>
  );
}
