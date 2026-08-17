"use client";

import { useActionState, useState } from "react";

import { PrimaryButton, SecondaryButton } from "@/components/relgov/buttons";
import { LABELS } from "@/lib/appwrite/constants";
import { convidarUsuario, type ConviteFormState } from "./actions";

export function ConviteForm() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<ConviteFormState, FormData>(
    convidarUsuario,
    {}
  );

  if (!open) {
    return <PrimaryButton onClick={() => setOpen(true)}>+ Convidar usuário</PrimaryButton>;
  }

  if (state.senhaTemporaria) {
    return (
      <div className="max-w-[420px] rounded-lg border border-relgov-border bg-relgov-surface p-4">
        <p className="text-[13px] font-semibold text-relgov-navy">Usuário convidado</p>
        <p className="mt-1 text-[12.5px] text-relgov-secondary">
          Repasse esta senha temporária ao convidado — ela só aparece nesta tela uma vez.
        </p>
        <p className="mt-2 rounded-md bg-relgov-surface-subtle px-3 py-2 font-mono text-[14px] font-semibold text-relgov-navy">
          {state.senhaTemporaria}
        </p>
        <SecondaryButton className="mt-3" onClick={() => setOpen(false)}>
          Fechar
        </SecondaryButton>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className="flex max-w-[420px] flex-col gap-3 rounded-lg border border-relgov-border bg-relgov-surface p-4"
    >
      {state.error && (
        <p className="rounded-md border border-relgov-danger-border bg-relgov-danger-bg px-2.5 py-1.5 text-[12px] text-relgov-danger">
          {state.error}
        </p>
      )}
      <input
        name="name"
        placeholder="Nome"
        required
        className="rounded-[7px] border border-relgov-border-control bg-relgov-surface px-3 py-2 text-[13px] outline-none focus:border-relgov-navy"
      />
      <input
        name="email"
        type="email"
        placeholder="E-mail"
        required
        className="rounded-[7px] border border-relgov-border-control bg-relgov-surface px-3 py-2 text-[13px] outline-none focus:border-relgov-navy"
      />
      <select
        name="role"
        defaultValue={LABELS.leitor}
        className="rounded-[7px] border border-relgov-border-control bg-relgov-surface px-3 py-2 text-[13px] outline-none"
      >
        <option value={LABELS.administrador}>Administrador</option>
        <option value={LABELS.coordenadorRelgov}>Coordenador RelGov</option>
        <option value={LABELS.leitor}>Leitor</option>
      </select>
      <div className="flex gap-2">
        <PrimaryButton type="submit" disabled={pending} className="flex-1">
          {pending ? "Criando…" : "Criar convite"}
        </PrimaryButton>
        <SecondaryButton type="button" onClick={() => setOpen(false)}>
          Cancelar
        </SecondaryButton>
      </div>
    </form>
  );
}
