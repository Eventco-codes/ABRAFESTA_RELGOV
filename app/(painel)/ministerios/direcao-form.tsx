"use client";

import { useActionState, useRef, useState } from "react";

import { PrimaryButton, SecondaryButton } from "@/components/relgov/buttons";
import type { DirecaoMinisterio } from "@/lib/siorg/direcao";
import type { MinisterioDirecao } from "@/lib/types";
import { salvarDirecaoMinisterio, type DirecaoFormState } from "./actions";

const inputClass =
  "rounded-[7px] border border-relgov-border-control bg-relgov-surface px-3 py-2.5 text-[13px] text-relgov-body outline-none focus:border-relgov-navy";

function CargoConfirmado({
  titulo,
  cargo,
  nomeManual,
}: {
  titulo: string;
  cargo: { denominacao: string; funcao: string; nomeTitular: string | null } | null;
  nomeManual: string | null;
}) {
  return (
    <div className="rounded-[7px] border border-relgov-border bg-relgov-surface-subtle px-3 py-2">
      <p className="relgov-label text-[9.5px]">{titulo}</p>
      {cargo ? (
        <p className="mt-0.5 text-[12px] text-relgov-muted">
          Cargo confirmado no SIORG ({cargo.denominacao}
          {cargo.funcao ? ` · ${cargo.funcao}` : ""}){!nomeManual && !cargo.nomeTitular && " — nome do titular não disponibilizado pela fonte pública"}
        </p>
      ) : (
        <p className="mt-0.5 text-[12px] text-relgov-muted">Cargo não localizado na estrutura do SIORG.</p>
      )}
    </div>
  );
}

export function DirecaoForm({
  ministerioId,
  direcaoSiorg,
  direcaoManual,
  editable,
}: {
  ministerioId: string;
  direcaoSiorg: DirecaoMinisterio;
  direcaoManual: MinisterioDirecao | null;
  editable: boolean;
}) {
  const [editando, setEditando] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const [state, formAction, pending] = useActionState<DirecaoFormState, FormData>(
    async (prev, formData) => {
      const result = await salvarDirecaoMinisterio(prev, formData);
      if (!result.error) setEditando(false);
      return result;
    },
    {}
  );

  const temContatoManual =
    direcaoManual &&
    (direcaoManual.ministroNome || direcaoManual.chefeGabineteNome);

  return (
    <div className="rounded-[9px] border border-relgov-border bg-relgov-surface p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-[16px] font-semibold text-relgov-navy">Direção</h2>
        {editable && !editando && (
          <button
            type="button"
            onClick={() => setEditando(true)}
            className="text-[12px] text-relgov-navy-light hover:underline"
          >
            {temContatoManual ? "Editar contatos" : "+ Cadastrar contatos"}
          </button>
        )}
      </div>

      {direcaoSiorg.erro && (
        <p className="mt-2 text-[11.5px] text-relgov-muted">
          Não foi possível confirmar os cargos no SIORG agora ({direcaoSiorg.erro}).
        </p>
      )}

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <CargoConfirmado
          titulo="Ministro"
          cargo={direcaoSiorg.ministro}
          nomeManual={direcaoManual?.ministroNome ?? null}
        />
        <CargoConfirmado
          titulo="Chefe de Gabinete"
          cargo={direcaoSiorg.chefeGabinete}
          nomeManual={direcaoManual?.chefeGabineteNome ?? null}
        />
      </div>

      {!editando ? (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <p className="relgov-label text-[9.5px]">Contato do Ministro</p>
            {direcaoManual?.ministroNome ? (
              <p className="mt-1 text-[12.5px] text-relgov-body">
                <span className="font-medium">{direcaoManual.ministroNome}</span>
                {direcaoManual.ministroTelefone && (
                  <span className="text-relgov-muted"> · {direcaoManual.ministroTelefone}</span>
                )}
                {direcaoManual.ministroEmail && (
                  <>
                    {" "}
                    ·{" "}
                    <a href={`mailto:${direcaoManual.ministroEmail}`} className="text-relgov-navy-light underline">
                      {direcaoManual.ministroEmail}
                    </a>
                  </>
                )}
              </p>
            ) : (
              <p className="mt-1 text-[12.5px] text-relgov-muted">Contato ainda não cadastrado.</p>
            )}
          </div>
          <div>
            <p className="relgov-label text-[9.5px]">Contato do Chefe de Gabinete</p>
            {direcaoManual?.chefeGabineteNome ? (
              <p className="mt-1 text-[12.5px] text-relgov-body">
                <span className="font-medium">{direcaoManual.chefeGabineteNome}</span>
                {direcaoManual.chefeGabineteTelefone && (
                  <span className="text-relgov-muted"> · {direcaoManual.chefeGabineteTelefone}</span>
                )}
                {direcaoManual.chefeGabineteEmail && (
                  <>
                    {" "}
                    ·{" "}
                    <a
                      href={`mailto:${direcaoManual.chefeGabineteEmail}`}
                      className="text-relgov-navy-light underline"
                    >
                      {direcaoManual.chefeGabineteEmail}
                    </a>
                  </>
                )}
              </p>
            ) : (
              <p className="mt-1 text-[12.5px] text-relgov-muted">Contato ainda não cadastrado.</p>
            )}
          </div>
        </div>
      ) : (
        <form ref={formRef} action={formAction} className="mt-3 flex flex-col gap-3">
          <input type="hidden" name="ministerioId" value={ministerioId} />

          {state.error && (
            <p className="rounded-md border border-relgov-danger-border bg-relgov-danger-bg px-3 py-2 text-[12.5px] text-relgov-danger">
              {state.error}
            </p>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label className="relgov-label text-[10px]">Ministro</label>
              <input
                name="ministroNome"
                placeholder="Nome"
                defaultValue={direcaoManual?.ministroNome ?? ""}
                className={inputClass}
              />
              <input
                name="ministroTelefone"
                placeholder="Telefone"
                defaultValue={direcaoManual?.ministroTelefone ?? ""}
                className={inputClass}
              />
              <input
                name="ministroEmail"
                type="email"
                placeholder="E-mail"
                defaultValue={direcaoManual?.ministroEmail ?? ""}
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="relgov-label text-[10px]">Chefe de Gabinete</label>
              <input
                name="chefeGabineteNome"
                placeholder="Nome"
                defaultValue={direcaoManual?.chefeGabineteNome ?? ""}
                className={inputClass}
              />
              <input
                name="chefeGabineteTelefone"
                placeholder="Telefone"
                defaultValue={direcaoManual?.chefeGabineteTelefone ?? ""}
                className={inputClass}
              />
              <input
                name="chefeGabineteEmail"
                type="email"
                placeholder="E-mail"
                defaultValue={direcaoManual?.chefeGabineteEmail ?? ""}
                className={inputClass}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <PrimaryButton type="submit" disabled={pending} className="flex-1">
              {pending ? "Salvando…" : "Salvar contatos"}
            </PrimaryButton>
            <SecondaryButton type="button" onClick={() => setEditando(false)}>
              Cancelar
            </SecondaryButton>
          </div>
        </form>
      )}
    </div>
  );
}
