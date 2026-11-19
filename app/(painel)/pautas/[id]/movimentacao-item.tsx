"use client";

import { useActionState, useState, useTransition } from "react";

import { SecondaryButton, PrimaryButton } from "@/components/relgov/buttons";
import {
  editarMovimentacao,
  excluirMovimentacao,
  type MovimentacaoFormState,
} from "../actions";

interface Props {
  pautaId: string;
  mov: { $id: string; data: string; titulo: string; descricao: string };
  dataFormatada: string;
  marcadorClass: string;
  podeEditar: boolean;
}

const campo =
  "rounded-[7px] border border-relgov-border-control bg-relgov-surface px-3 py-2 text-[12.5px] outline-none focus:border-relgov-navy";

export function MovimentacaoItem({ pautaId, mov, dataFormatada, marcadorClass, podeEditar }: Props) {
  const [editando, setEditando] = useState(false);
  const [excluindo, startExcluir] = useTransition();
  const [state, formAction, pending] = useActionState<MovimentacaoFormState, FormData>(
    async (prev, formData) => {
      const result = await editarMovimentacao(pautaId, mov.$id, prev, formData);
      if (!result.error) setEditando(false);
      return result;
    },
    {}
  );

  return (
    <li className="relative">
      <span className={`absolute -left-[21px] top-1 h-2 w-2 rounded-full ${marcadorClass}`} />
      {editando ? (
        <form action={formAction} className="flex flex-col gap-2">
          {state.error && <p className="text-[12px] text-relgov-danger">{state.error}</p>}
          <input type="date" name="data" defaultValue={mov.data.slice(0, 10)} required className={campo} />
          <input name="titulo" defaultValue={mov.titulo} required className={campo} />
          <textarea name="descricao" defaultValue={mov.descricao} required rows={8} className={campo} />
          <div className="flex gap-2">
            <PrimaryButton type="submit" disabled={pending} className="flex-1">
              {pending ? "Salvando…" : "Salvar"}
            </PrimaryButton>
            <SecondaryButton type="button" onClick={() => setEditando(false)}>
              Cancelar
            </SecondaryButton>
          </div>
        </form>
      ) : (
        <>
          <p className="font-mono text-[11px] text-relgov-muted">{dataFormatada}</p>
          <p className="text-[12.5px] font-medium text-relgov-body">{mov.titulo}</p>
          <p className="whitespace-pre-line text-[11.5px] text-relgov-muted">{mov.descricao}</p>
          {podeEditar && (
            <div className="mt-1 flex gap-3 text-[11px]">
              <button type="button" className="text-relgov-navy hover:underline" onClick={() => setEditando(true)}>
                Editar
              </button>
              <button
                type="button"
                disabled={excluindo}
                className="text-relgov-danger hover:underline"
                onClick={() => {
                  if (window.confirm("Excluir esta movimentação? Esta ação não pode ser desfeita.")) {
                    startExcluir(() => excluirMovimentacao(pautaId, mov.$id));
                  }
                }}
              >
                {excluindo ? "Excluindo…" : "Excluir"}
              </button>
            </div>
          )}
        </>
      )}
    </li>
  );
}
