"use client";

import { useActionState, useRef, useState } from "react";

import { PrimaryButton, SecondaryButton } from "@/components/relgov/buttons";
import { criarProjetoMinisterio, type ProjetoFormState } from "./actions";

const inputClass =
  "rounded-[7px] border border-relgov-border-control bg-relgov-surface px-3 py-2.5 text-[13px] text-relgov-body outline-none focus:border-relgov-navy";

interface ResponsavelRow {
  key: number;
}

export function NovoProjetoForm({
  ministerioId,
  ministerioNome,
}: {
  ministerioId: string;
  ministerioNome: string;
}) {
  const [open, setOpen] = useState(false);
  const [responsaveis, setResponsaveis] = useState<ResponsavelRow[]>([{ key: 0 }]);
  const nextKey = useRef(1);
  const formRef = useRef<HTMLFormElement>(null);

  const [state, formAction, pending] = useActionState<ProjetoFormState, FormData>(
    async (prev, formData) => {
      const result = await criarProjetoMinisterio(prev, formData);
      if (!result.error) {
        formRef.current?.reset();
        setResponsaveis([{ key: 0 }]);
        nextKey.current = 1;
        setOpen(false);
      }
      return result;
    },
    {}
  );

  if (!open) {
    return <PrimaryButton onClick={() => setOpen(true)}>+ Novo projeto</PrimaryButton>;
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="mt-3 flex flex-col gap-3 rounded-[9px] border border-relgov-border bg-relgov-surface p-4"
    >
      <input type="hidden" name="ministerioId" value={ministerioId} />
      <input type="hidden" name="ministerioNome" value={ministerioNome} />

      {state.error && (
        <p className="rounded-md border border-relgov-danger-border bg-relgov-danger-bg px-3 py-2 text-[12.5px] text-relgov-danger">
          {state.error}
        </p>
      )}

      <div>
        <label className="relgov-label block text-[10px]">Projeto (título)</label>
        <input name="titulo" required className={`mt-1 w-full ${inputClass}`} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="relgov-label block text-[10px]">Data</label>
          <input name="data" type="date" className={`mt-1 w-full ${inputClass}`} />
        </div>
        <div>
          <label className="relgov-label block text-[10px]">Link</label>
          <input name="link" type="url" placeholder="https://…" className={`mt-1 w-full ${inputClass}`} />
        </div>
      </div>

      <div>
        <label className="relgov-label block text-[10px]">Contexto</label>
        <textarea name="contexto" rows={3} className={`mt-1 w-full ${inputClass}`} />
      </div>

      <div>
        <label className="relgov-label block text-[10px]">Responsável(is)</label>
        <div className="mt-1.5 flex flex-col gap-2">
          {responsaveis.map((r) => (
            <div key={r.key} className="grid grid-cols-[1fr_1fr_1fr_auto] items-center gap-2">
              <input name="respNome" placeholder="Nome" required className={inputClass} />
              <input name="respTelefone" placeholder="Telefone" className={inputClass} />
              <input name="respEmail" type="email" placeholder="E-mail" className={inputClass} />
              <button
                type="button"
                disabled={responsaveis.length === 1}
                onClick={() => setResponsaveis((prev) => prev.filter((x) => x.key !== r.key))}
                className="px-2 text-[13px] text-relgov-muted hover:text-relgov-danger disabled:opacity-30"
                aria-label="Remover responsável"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => {
            setResponsaveis((prev) => [...prev, { key: nextKey.current }]);
            nextKey.current += 1;
          }}
          className="mt-1.5 text-[12px] text-relgov-navy-light hover:underline"
        >
          + adicionar responsável
        </button>
      </div>

      <div>
        <label className="relgov-label block text-[10px]">Anexos</label>
        <input
          type="file"
          name="arquivos"
          multiple
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png"
          className="mt-1 w-full rounded-[7px] border border-relgov-border-control bg-relgov-surface px-3 py-2 text-[12px] outline-none file:mr-2 file:rounded-[5px] file:border-0 file:bg-relgov-surface-subtle file:px-2 file:py-1 file:text-[11.5px]"
        />
      </div>

      <div className="flex gap-2">
        <PrimaryButton type="submit" disabled={pending} className="flex-1">
          {pending ? "Salvando…" : "Salvar projeto"}
        </PrimaryButton>
        <SecondaryButton type="button" onClick={() => setOpen(false)}>
          Cancelar
        </SecondaryButton>
      </div>
    </form>
  );
}
