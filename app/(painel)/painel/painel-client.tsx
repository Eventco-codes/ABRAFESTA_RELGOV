"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { PrimaryButton, SecondaryLinkButton } from "@/components/relgov/buttons";
import { enviarResumoAosGestores, rodarMonitoramento, setPainelTab } from "./actions";

export function PainelTabs({ active }: { active: "resumo" | "indicadores" }) {
  return (
    <>
      <Link
        href="/painel?tab=resumo"
        onClick={() => setPainelTab("resumo")}
        className={`flex items-center gap-2 border-b-2 pb-2.5 text-[13.5px] ${
          active === "resumo"
            ? "border-relgov-gold font-semibold text-relgov-navy"
            : "border-transparent font-normal text-relgov-muted"
        }`}
      >
        Resumo semanal
        <span className="rounded-[9px] bg-relgov-gold px-1.5 py-0.5 font-mono text-[10px] font-semibold text-relgov-navy">
          NOVO
        </span>
      </Link>
      <Link
        href="/painel?tab=indicadores"
        onClick={() => setPainelTab("indicadores")}
        className={`border-b-2 pb-2.5 text-[13.5px] ${
          active === "indicadores"
            ? "border-relgov-gold font-semibold text-relgov-navy"
            : "border-transparent font-normal text-relgov-muted"
        }`}
      >
        Indicadores
      </Link>
    </>
  );
}

export function PainelTopbarActions({ canManage }: { canManage: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <>
      <SecondaryLinkButton href="/relatorios">Exportar relatório</SecondaryLinkButton>
      {canManage && (
        <PrimaryButton
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await rodarMonitoramento();
              router.refresh();
            })
          }
        >
          {pending ? "Rodando…" : "Rodar monitoramento"}
        </PrimaryButton>
      )}
    </>
  );
}

export function EnviarResumoButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div>
      <PrimaryButton
        className="w-full py-3"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const id = await enviarResumoAosGestores();
            router.push(`/painel/email-preview/${id}`);
          })
        }
      >
        {pending ? "Preparando…" : "Enviar resumo aos gestores"}
      </PrimaryButton>
      <p className="mt-2 text-center text-[11.5px] text-relgov-muted">
        Envio automático toda segunda, 06:00
      </p>
    </div>
  );
}
