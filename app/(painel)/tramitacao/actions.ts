"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth";
import { atualizarTramitacaoViaCamara } from "@/lib/camara/refresh";
import { listPautas } from "@/lib/relgov/data";
import { pautasLegislativas } from "@/lib/relgov/filters";

export interface AtualizarTramitacaoResultado {
  mensagem?: string;
  erro?: string;
}

/** Botão "Atualizar" da Tramitação — varredura real via API pública da Câmara (ver lib/camara/refresh.ts). */
export async function atualizarTramitacao(): Promise<AtualizarTramitacaoResultado> {
  const { tablesDB, user } = await requireRole("administrador", "coordenadorrelgov");

  const todasPautas = await listPautas(tablesDB);
  const pautas = pautasLegislativas(todasPautas);

  try {
    const resultado = await atualizarTramitacaoViaCamara(tablesDB, pautas, user.name || user.email);

    revalidatePath("/tramitacao");
    revalidatePath("/pautas");

    const partes = [
      `${resultado.verificadas} pauta(s) com link da Câmara verificada(s)`,
      `${resultado.atualizadas} atualizada(s)`,
    ];
    if (resultado.semLinkCamara > 0) {
      partes.push(`${resultado.semLinkCamara} sem link oficial da Câmara (não verificadas)`);
    }
    return { mensagem: partes.join(" · ") };
  } catch (err) {
    return { erro: err instanceof Error ? err.message : "Falha ao atualizar tramitação." };
  }
}
