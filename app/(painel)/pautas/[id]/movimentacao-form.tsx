"use client";

import { useActionState, useRef, useState } from "react";

import { SecondaryButton, PrimaryButton } from "@/components/relgov/buttons";
import { registrarMovimentacao, type MovimentacaoFormState } from "../actions";

export function MovimentacaoForm({ pautaId }: { pautaId: string }) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState<MovimentacaoFormState, FormData>(
    async (prev, formData) => {
      const result = await registrarMovimentacao(pautaId, prev, formData);
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
      <SecondaryButton className="w-full" onClick={() => setOpen(true)}>
        + Registrar movimentação
      </SecondaryButton>
    );
  }

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-2.5">
      {state.error && (
        <p className="rounded-md border border-relgov-danger-border bg-relgov-danger-bg px-2.5 py-1.5 text-[12px] text-relgov-danger">
          {state.error}
        </p>
      )}
      <input
        name="titulo"
        placeholder="Título da movimentação"
        required
        className="rounded-[7px] border border-relgov-border-control bg-relgov-surface px-3 py-2 text-[12.5px] outline-none focus:border-relgov-navy"
      />
      <textarea
        name="descricao"
        placeholder="Descrição"
        required
        rows={3}
        className="rounded-[7px] border border-relgov-border-control bg-relgov-surface px-3 py-2 text-[12.5px] outline-none focus:border-relgov-navy"
      />
      <div className="flex gap-2">
        <PrimaryButton type="submit" disabled={pending} className="flex-1">
          {pending ? "Salvando…" : "Salvar"}
        </PrimaryButton>
        <SecondaryButton type="button" onClick={() => setOpen(false)}>
          Cancelar
        </SecondaryButton>
      </div>
    </form>
  );
}
