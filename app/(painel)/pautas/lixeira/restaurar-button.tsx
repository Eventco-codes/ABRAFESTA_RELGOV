"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { SecondaryButton } from "@/components/relgov/buttons";
import { restaurarPauta } from "../actions";

export function RestaurarButton({ pautaId }: { pautaId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <SecondaryButton
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await restaurarPauta(pautaId);
          router.refresh();
        })
      }
    >
      {pending ? "Restaurando…" : "Restaurar"}
    </SecondaryButton>
  );
}
