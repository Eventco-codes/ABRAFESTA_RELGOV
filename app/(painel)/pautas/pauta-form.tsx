"use client";

import { useActionState } from "react";

import { PrimaryButton, SecondaryLinkButton } from "@/components/relgov/buttons";
import type { Pauta } from "@/lib/types";
import type { PautaFormState } from "./actions";

const inputClass =
  "mt-1.5 w-full rounded-[7px] border border-relgov-border-control bg-relgov-surface px-3.5 py-2.5 text-[13.5px] text-relgov-body outline-none focus:border-relgov-navy";

interface PautaFormProps {
  action: (prevState: PautaFormState, formData: FormData) => Promise<PautaFormState>;
  pauta?: Pauta;
  cancelHref: string;
  submitLabel: string;
  showEncaminhamentos?: boolean;
}

export function PautaForm({
  action,
  pauta,
  cancelHref,
  submitLabel,
  showEncaminhamentos,
}: PautaFormProps) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="flex max-w-[720px] flex-col gap-4">
      {state.error && (
        <p className="rounded-md border border-relgov-danger-border bg-relgov-danger-bg px-3 py-2 text-sm text-relgov-danger">
          {state.error}
        </p>
      )}

      <Field label="Título" name="titulo" defaultValue={pauta?.titulo} />
      <div className="grid grid-cols-2 gap-4">
        <Field label="Eixo" name="eixo" defaultValue={pauta?.eixo} />
        <div>
          <label className="relgov-label block text-[10px]">Prioridade</label>
          <select
            name="prioridade"
            defaultValue={pauta?.prioridade ?? "Alta"}
            className={inputClass}
          >
            <option value="Alta">Alta</option>
            <option value="Media">Média</option>
            <option value="Baixa">Baixa</option>
          </select>
        </div>
      </div>
      <TextAreaField label="Atuação" name="atuacao" defaultValue={pauta?.atuacao} />
      <div className="grid grid-cols-2 gap-4">
        <TextAreaField label="Contexto" name="contexto" defaultValue={pauta?.contexto} />
        <TextAreaField
          label="Situação atual"
          name="situacaoAtual"
          defaultValue={pauta?.situacaoAtual}
        />
      </div>
      <Field label="Interlocutores" name="interlocutores" defaultValue={pauta?.interlocutores} />
      <Field label="Status" name="status" defaultValue={pauta?.status} />
      <Field
        label="Fonte / referência"
        name="fonteReferencia"
        defaultValue={pauta?.fonteReferencia}
      />
      <Field
        label="Link oficial monitorado"
        name="linkOficial"
        defaultValue={pauta?.linkOficial ?? ""}
        type="url"
        required={false}
      />

      {showEncaminhamentos && (
        <TextAreaField
          label="Próximos encaminhamentos (um por linha)"
          name="proximosEncaminhamentos"
          rows={4}
          required={false}
        />
      )}

      <div className="mt-2 flex gap-3">
        <PrimaryButton type="submit" disabled={pending}>
          {pending ? "Salvando…" : submitLabel}
        </PrimaryButton>
        <SecondaryLinkButton href={cancelHref}>Cancelar</SecondaryLinkButton>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  defaultValue,
  type = "text",
  required = true,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="relgov-label block text-[10px]">{label}</label>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        className={inputClass}
      />
    </div>
  );
}

function TextAreaField({
  label,
  name,
  defaultValue,
  rows = 3,
  required = true,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  rows?: number;
  required?: boolean;
}) {
  return (
    <div>
      <label className="relgov-label block text-[10px]">{label}</label>
      <textarea
        name={name}
        defaultValue={defaultValue}
        rows={rows}
        required={required}
        className={inputClass}
      />
    </div>
  );
}
