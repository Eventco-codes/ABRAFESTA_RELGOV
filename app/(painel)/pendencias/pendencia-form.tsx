"use client";

import { useActionState } from "react";

import { PrimaryButton, SecondaryLinkButton } from "@/components/relgov/buttons";
import type { Pendencia } from "@/lib/types";
import type { PendenciaFormState } from "./actions";

const inputClass =
  "mt-1.5 w-full rounded-[7px] border border-relgov-border-control bg-relgov-surface px-3.5 py-2.5 text-[13.5px] text-relgov-body outline-none focus:border-relgov-navy";

interface PendenciaFormProps {
  action: (prevState: PendenciaFormState, formData: FormData) => Promise<PendenciaFormState>;
  pautas: { $id: string; titulo: string }[];
  pendencia?: Pendencia;
  defaultPautaId?: string;
  cancelHref: string;
  submitLabel: string;
}

export function PendenciaForm({
  action,
  pautas,
  pendencia,
  defaultPautaId,
  cancelHref,
  submitLabel,
}: PendenciaFormProps) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="flex max-w-[640px] flex-col gap-4">
      {state.error && (
        <p className="rounded-md border border-relgov-danger-border bg-relgov-danger-bg px-3 py-2 text-sm text-relgov-danger">
          {state.error}
        </p>
      )}

      <div>
        <label className="relgov-label block text-[10px]">
          Pauta <span className="normal-case text-relgov-placeholder">(opcional)</span>
        </label>
        <select
          name="pautaId"
          defaultValue={pendencia?.pautaId ?? defaultPautaId ?? ""}
          className={inputClass}
        >
          <option value="">— nenhuma (pendência institucional) —</option>
          {pautas.map((p) => (
            <option key={p.$id} value={p.$id}>
              {p.titulo}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="relgov-label block text-[10px]">Descrição</label>
        <textarea
          name="descricao"
          defaultValue={pendencia?.descricao}
          required
          rows={2}
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Responsável" name="responsavel" defaultValue={pendencia?.responsavel} />
        <div>
          <label className="relgov-label block text-[10px]">Prioridade</label>
          <select
            name="prioridade"
            defaultValue={pendencia?.prioridade ?? "Alta"}
            className={inputClass}
          >
            <option value="Alta">Alta</option>
            <option value="Media">Média</option>
            <option value="Baixa">Baixa</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Status" name="status" defaultValue={pendencia?.status ?? "Pendente"} />
        <Field
          label="Prazo sugerido"
          name="prazoSugerido"
          type="date"
          defaultValue={pendencia?.prazoSugerido}
        />
      </div>

      <div>
        <label className="relgov-label block text-[10px]">Próxima cobrança</label>
        <textarea
          name="proximaCobranca"
          defaultValue={pendencia?.proximaCobranca}
          required
          rows={2}
          className={inputClass}
        />
      </div>

      <Field
        label="Evidência (opcional)"
        name="evidencia"
        defaultValue={pendencia?.evidencia}
        required={false}
      />
      <div>
        <label className="relgov-label block text-[10px]">Observações (opcional)</label>
        <textarea
          name="observacoes"
          defaultValue={pendencia?.observacoes}
          rows={2}
          className={inputClass}
        />
      </div>

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
