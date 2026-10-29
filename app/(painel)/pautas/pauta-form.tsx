"use client";

import { useActionState } from "react";

import { PrimaryButton, SecondaryLinkButton } from "@/components/relgov/buttons";
import { EIXOS_MAE, STATUS_PADRAO, STATUS_PAUTA, eixoMae, subeixoDe } from "@/lib/relgov/taxonomia";
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
  const eixoAtual = pauta ? eixoMae(pauta.eixo) : undefined;

  return (
    <form action={formAction} className="flex max-w-[720px] flex-col gap-4">
      {state.error && (
        <p className="rounded-md border border-relgov-danger-border bg-relgov-danger-bg px-3 py-2 text-sm text-relgov-danger">
          {state.error}
        </p>
      )}

      <Field label="Título" name="titulo" defaultValue={pauta?.titulo} />
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="relgov-label block text-[10px]">Eixo</label>
          <select
            name="eixoMae"
            required
            defaultValue={eixoAtual && EIXOS_MAE.includes(eixoAtual) ? eixoAtual : ""}
            className={inputClass}
          >
            <option value="" disabled>
              Selecione…
            </option>
            {EIXOS_MAE.map((eixo) => (
              <option key={eixo} value={eixo}>
                {eixo}
              </option>
            ))}
          </select>
        </div>
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
      <Field
        label="Subeixo (opcional)"
        name="subeixo"
        defaultValue={pauta ? subeixoDe(pauta.eixo) : ""}
        required={false}
      />
      <TextAreaField label="Atuação" name="atuacao" defaultValue={pauta?.atuacao} />
      <div className="grid grid-cols-2 gap-4">
        <TextAreaField label="Contexto" name="contexto" defaultValue={pauta?.contexto} />
        <TextAreaField
          label="Situação atual"
          name="situacaoAtual"
          defaultValue={pauta?.situacaoAtual}
        />
      </div>
      <div className="rounded-lg border border-relgov-border bg-relgov-surface p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-relgov-gold">
          Identificação da Proposição
        </p>
        <div className="mt-2.5 grid grid-cols-2 gap-4">
          <Field
            label="Autor"
            name="autor"
            defaultValue={pauta?.autor ?? ""}
            required={false}
          />
          <Field
            label="Apresentação"
            name="dataApresentacao"
            type="date"
            defaultValue={pauta?.dataApresentacao ?? ""}
            required={false}
          />
        </div>
        <div className="mt-4">
          <TextAreaField
            label="Ementa"
            name="ementa"
            defaultValue={pauta?.ementa ?? ""}
            required={false}
          />
        </div>
      </div>

      <Field
        label="Data da última movimentação (em tramitação)"
        name="dataUltimaMovimentacao"
        type="date"
        defaultValue={pauta?.dataUltimaMovimentacao ?? ""}
        required={false}
      />

      <div>
        <label className="relgov-label block text-[10px]">Incluir em Tramitação?</label>
        <select
          name="incluirTramitacao"
          defaultValue={pauta ? String(pauta.incluirTramitacao) : "false"}
          className={inputClass}
        >
          <option value="true">Sim — mover para Tramitação e incluir no monitoramento (sincronizar)</option>
          <option value="false">Não — manter somente em Pauta</option>
        </select>
      </div>

      <Field label="Interlocutores" name="interlocutores" defaultValue={pauta?.interlocutores} />
      <div>
        <label className="relgov-label block text-[10px]">Status</label>
        <select
          name="status"
          required
          defaultValue={pauta?.status ?? STATUS_PADRAO}
          className={inputClass}
        >
          {/* Pauta antiga com status fora da lista: mantém o valor até ser reclassificada. */}
          {pauta && !(STATUS_PAUTA as readonly string[]).includes(pauta.status) && (
            <option value={pauta.status}>{pauta.status} (antigo — reclassifique)</option>
          )}
          {STATUS_PAUTA.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
        <p className="mt-1 text-[11.5px] text-relgov-muted">
          Ao mudar o status, atualize também a “Situação atual”.
        </p>
      </div>
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
