"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { PrimaryButton, SecondaryButton } from "@/components/relgov/buttons";
import { formatDateBR } from "@/lib/relgov/derived";
import { calcularMesclagem } from "@/lib/relgov/mesclar";
import type { Movimentacao } from "@/lib/types";
import { mesclarMovimentacoes } from "../actions";
import { MovimentacaoItem } from "./movimentacao-item";

const MARCADOR_ORIGEM: Record<string, string> = {
  VARREDURA_AUTOMATICA: "bg-relgov-gold",
  REGISTRO_MANUAL: "bg-relgov-navy",
};

export function HistoricoMovimentacoes({
  pautaId,
  movimentacoes,
  podeEditar,
}: {
  pautaId: string;
  movimentacoes: Movimentacao[];
  /** Permite editar, excluir e mesclar registros (administrador e coordenador RelGov). */
  podeEditar: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [mesclando, setMesclando] = useState(false);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [erro, setErro] = useState<string | null>(null);

  const proposta = useMemo(() => {
    if (selecionados.size < 2) return null;
    return calcularMesclagem(movimentacoes.filter((m) => selecionados.has(m.$id)));
  }, [selecionados, movimentacoes]);

  function alternar(id: string) {
    setErro(null);
    setSelecionados((atual) => {
      const proximo = new Set(atual);
      if (proximo.has(id)) proximo.delete(id);
      else proximo.add(id);
      return proximo;
    });
  }

  function encerrar() {
    setMesclando(false);
    setSelecionados(new Set());
    setErro(null);
  }

  function confirmar() {
    startTransition(async () => {
      const resultado = await mesclarMovimentacoes(pautaId, [...selecionados]);
      if (resultado.error) {
        setErro(resultado.error);
        router.refresh();
        return;
      }
      encerrar();
      router.refresh();
    });
  }

  return (
    <div>
      <ol className="mt-3 flex flex-col gap-[18px] border-l border-relgov-border pl-4">
        {movimentacoes.length === 0 && (
          <p className="text-[12px] text-relgov-muted">Nenhuma movimentação registrada.</p>
        )}
        {movimentacoes.map((mov, index) => {
          const marcadorClass = index === 0 ? "bg-relgov-gold" : MARCADOR_ORIGEM[mov.origem];

          // Fora do modo de mesclagem: item com Editar/Excluir.
          if (!mesclando) {
            return (
              <MovimentacaoItem
                key={mov.$id}
                pautaId={pautaId}
                mov={{ $id: mov.$id, data: mov.data, titulo: mov.titulo, descricao: mov.descricao }}
                dataFormatada={formatDateBR(mov.data)}
                marcadorClass={marcadorClass}
                podeEditar={podeEditar}
              />
            );
          }

          return (
            <li key={mov.$id} className="relative">
              <span className={`absolute -left-[21px] top-1 h-2 w-2 rounded-full ${marcadorClass}`} />
              <label className="flex cursor-pointer items-start gap-2">
                <input
                  type="checkbox"
                  checked={selecionados.has(mov.$id)}
                  onChange={() => alternar(mov.$id)}
                  disabled={pending}
                  className="mt-1 h-3.5 w-3.5 shrink-0 accent-relgov-navy"
                  aria-label={`Selecionar: ${mov.titulo}`}
                />
                <span className="block min-w-0">
                  <span className="block font-mono text-[11px] text-relgov-muted">
                    {formatDateBR(mov.data)}
                  </span>
                  <span className="block text-[12.5px] font-medium text-relgov-body">
                    {mov.titulo}
                  </span>
                  <span className="block whitespace-pre-line text-[11.5px] text-relgov-muted">
                    {mov.descricao}
                  </span>
                </span>
              </label>
            </li>
          );
        })}
      </ol>

      {podeEditar && movimentacoes.length >= 2 && !mesclando && (
        <div className="mt-4">
          <SecondaryButton className="w-full" onClick={() => setMesclando(true)}>
            Mesclar registros
          </SecondaryButton>
        </div>
      )}

      {mesclando && (
        <div className="mt-4 flex flex-col gap-2.5 rounded-lg border border-relgov-border bg-relgov-surface p-3">
          <p className="text-[12px] font-medium text-relgov-body">
            {selecionados.size < 2
              ? "Marque 2 ou mais registros para unir em um só."
              : `${selecionados.size} registros selecionados`}
          </p>

          {proposta?.ok && (
            <div className="flex flex-col gap-1.5">
              <p className="relgov-label text-[10px]">Prévia do registro resultante</p>
              <div className="rounded-md border border-relgov-border bg-relgov-surface-subtle px-2.5 py-2">
                <p className="text-[12.5px] font-medium text-relgov-body">{proposta.titulo}</p>
                <p className="mt-1 whitespace-pre-line text-[11.5px] text-relgov-secondary">
                  {proposta.descricao}
                </p>
              </div>
              <p className="text-[11px] text-relgov-muted">
                Todo o conteúdo é unido no registro mais recente, sem repetir informação. Os outros{" "}
                {proposta.excluirIds.length} serão excluídos e isso não pode ser desfeito.
              </p>
            </div>
          )}

          {(proposta && !proposta.ok ? proposta.error : erro) && (
            <p className="rounded-md border border-relgov-danger-border bg-relgov-danger-bg px-2.5 py-1.5 text-[12px] text-relgov-danger">
              {proposta && !proposta.ok ? proposta.error : erro}
            </p>
          )}

          <div className="flex gap-2">
            <PrimaryButton
              type="button"
              disabled={pending || !proposta?.ok}
              onClick={confirmar}
              className="flex-1"
            >
              {pending ? "Mesclando…" : "Confirmar mesclagem"}
            </PrimaryButton>
            <SecondaryButton type="button" disabled={pending} onClick={encerrar}>
              Cancelar
            </SecondaryButton>
          </div>
        </div>
      )}
    </div>
  );
}
