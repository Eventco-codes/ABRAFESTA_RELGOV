"use client";

import { useActionState, useRef, useState } from "react";

import { SecondaryButton, PrimaryButton } from "@/components/relgov/buttons";
import { uploadAnexoPendencia, type AnexoFormState } from "./actions";

export function AnexoUploadForm({ pendenciaId }: { pendenciaId: string }) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState<AnexoFormState, FormData>(
    async (prev, formData) => {
      const result = await uploadAnexoPendencia(pendenciaId, prev, formData);
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
      <SecondaryButton type="button" onClick={() => setOpen(true)}>
        + Anexar documento ou imagem
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
        type="file"
        name="arquivo"
        required
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png"
        className="rounded-[7px] border border-relgov-border-control bg-relgov-surface px-3 py-2 text-[12px] outline-none file:mr-2 file:rounded-[5px] file:border-0 file:bg-relgov-surface-subtle file:px-2 file:py-1 file:text-[11.5px]"
      />
      <div className="flex gap-2">
        <PrimaryButton type="submit" disabled={pending} className="flex-1">
          {pending ? "Enviando…" : "Enviar"}
        </PrimaryButton>
        <SecondaryButton type="button" onClick={() => setOpen(false)}>
          Cancelar
        </SecondaryButton>
      </div>
    </form>
  );
}
