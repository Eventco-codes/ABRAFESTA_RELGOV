"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { montarMensagemCobranca } from "@/lib/relgov/derived";
import type { Pendencia } from "@/lib/types";
import { excluirPendencia, marcarPendenciaConcluida, registrarEnvioCobranca } from "./actions";

const iconBtn =
  "flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] text-[14px] leading-none text-relgov-muted transition-colors disabled:cursor-not-allowed disabled:opacity-40";

export function PendenciaAcoes({
  pendencia,
  tituloPauta,
}: {
  pendencia: Pendencia;
  tituloPauta: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const concluida = pendencia.status.toLowerCase().includes("conclu");

  function stop(e: React.SyntheticEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  return (
    <div className="flex items-center gap-1">
      {!concluida && (
        <button
          type="button"
          title="Marcar como concluída"
          aria-label="Marcar como concluída"
          disabled={pending}
          onClick={(e) => {
            stop(e);
            startTransition(async () => {
              await marcarPendenciaConcluida(pendencia.$id, pendencia.pautaId);
              router.refresh();
            });
          }}
          className={`${iconBtn} hover:bg-relgov-success-bg hover:text-relgov-success`}
        >
          ✓
        </button>
      )}
      <button
        type="button"
        title="Enviar cobrança por e-mail"
        aria-label="Enviar cobrança por e-mail"
        disabled={pending}
        onClick={(e) => {
          stop(e);
          const { assunto, corpo } = montarMensagemCobranca(pendencia, tituloPauta);
          window.location.href = `mailto:?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpo)}`;
          startTransition(async () => {
            await registrarEnvioCobranca(pendencia.$id, pendencia.pautaId);
            router.refresh();
          });
        }}
        className={`${iconBtn} hover:bg-relgov-surface-subtle-2 hover:text-relgov-navy-light`}
      >
        ✉
      </button>
      <button
        type="button"
        title="Excluir pendência"
        aria-label="Excluir pendência"
        disabled={pending}
        onClick={(e) => {
          stop(e);
          const confirmado = window.confirm(
            `Excluir a pendência "${pendencia.descricao}"?\n\nApaga definitivamente do banco, junto com os documentos anexados. Não tem como desfazer.`
          );
          if (!confirmado) return;
          startTransition(async () => {
            await excluirPendencia(pendencia.$id, pendencia.pautaId);
            router.refresh();
          });
        }}
        className={`${iconBtn} hover:bg-relgov-danger-bg hover:text-relgov-danger`}
      >
        🗑
      </button>
    </div>
  );
}
