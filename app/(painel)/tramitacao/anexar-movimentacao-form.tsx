"use client";

import { useActionState, useRef, useState } from "react";

import { uploadAnexoMovimentacao, type AnexoFormState } from "../pautas/actions";

export function AnexarMovimentacaoForm({
  pautaId,
  movimentacaoId,
}: {
  pautaId: string;
  movimentacaoId: string;
}) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState<AnexoFormState, FormData>(
    async (prev, formData) => {
      const result = await uploadAnexoMovimentacao(pautaId, movimentacaoId, prev, formData);
      if (!result.error) {
        formRef.current?.reset();
        setOpen(false);
      }
      return result;
    },
    {}
  );

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-1 text-[11px] text-relgov-navy-light hover:underline"
      >
        + anexar documento
      </button>
    );
  }

  return (
    <form ref={formRef} action={formAction} className="mt-1.5 flex flex-wrap items-center gap-1.5">
      <input
        type="file"
        name="arquivo"
        required
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png"
        className="max-w-[220px] text-[11px] file:mr-1.5 file:rounded-[5px] file:border-0 file:bg-relgov-surface-subtle file:px-1.5 file:py-1 file:text-[10.5px]"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-[5px] bg-relgov-gold px-2 py-1 text-[11px] font-semibold text-relgov-navy disabled:opacity-60"
      >
        {pending ? "…" : "Enviar"}
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="text-[11px] text-relgov-muted hover:underline"
      >
        Cancelar
      </button>
      {state.error && <p className="w-full text-[11px] text-relgov-danger">{state.error}</p>}
    </form>
  );
}
