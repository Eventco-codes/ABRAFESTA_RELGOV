"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { anexoHref, formatTamanhoArquivo } from "@/lib/relgov/anexos";
import type { MinisterioProjetoAnexo } from "@/lib/types";
import { excluirAnexoProjeto } from "./actions";

export function AnexoProjetoItem({
  anexo,
  ministerioId,
  editable,
}: {
  anexo: MinisterioProjetoAnexo;
  ministerioId: string;
  editable: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center justify-between gap-2 rounded-[7px] border border-relgov-border bg-relgov-surface px-3 py-2">
      <a
        href={anexoHref(anexo)}
        className="flex min-w-0 items-center gap-2 text-[12.5px] text-relgov-navy-light hover:underline"
      >
        <span aria-hidden>📎</span>
        <span className="truncate">{anexo.nome}</span>
        <span className="shrink-0 text-[11px] text-relgov-muted">
          {formatTamanhoArquivo(anexo.tamanho)}
        </span>
      </a>
      {editable && (
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await excluirAnexoProjeto(anexo.$id, ministerioId);
              router.refresh();
            })
          }
          className="shrink-0 text-[11px] text-relgov-muted hover:text-relgov-danger disabled:opacity-60"
        >
          {pending ? "…" : "Remover"}
        </button>
      )}
    </div>
  );
}
