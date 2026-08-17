"use server";

import { revalidatePath } from "next/cache";
import { ID, Query } from "node-appwrite";

import { requireRole, requireSession } from "@/lib/auth";
import { createAdminClient, createSessionClient } from "@/lib/appwrite/server";
import { APPWRITE_DATABASE_ID, TABLES, hasRelgovAccess } from "@/lib/appwrite/constants";
import {
  getResumoSemanalPorSemana,
  listMovimentacoesRecentes,
  listPautas,
  listPendencias,
} from "@/lib/relgov/data";
import { pautasAtivas, pendenciasAbertas, pendenciasVencidas, semanaCorrente } from "@/lib/relgov/derived";
import { gerarResumoAutomatico, movimentacoesUltimos7Dias } from "@/lib/relgov/resumo";
import { renderWeeklyEmailHtml } from "@/lib/relgov/email-template";
import type { ResumoSemanal } from "@/lib/types";

export async function setPainelTab(tab: "resumo" | "indicadores") {
  const { sessionSecret } = await requireSession();
  const { account } = createSessionClient(sessionSecret);
  await account.updatePrefs({ prefs: { ultimaAbaPainel: tab } });
}

async function garantirResumoDaSemana(
  tablesDB: ReturnType<typeof createSessionClient>["tablesDB"]
): Promise<ResumoSemanal> {
  const { inicio, fim } = semanaCorrente();
  const existente = await getResumoSemanalPorSemana(tablesDB, inicio);
  if (existente) return existente;

  const [pautas, pendencias, movimentacoes] = await Promise.all([
    listPautas(tablesDB),
    listPendencias(tablesDB),
    listMovimentacoesRecentes(tablesDB),
  ]);
  const recentes = movimentacoesUltimos7Dias(movimentacoes);
  const { manchete, lide } = gerarResumoAutomatico(pautas, pendencias, recentes);

  return tablesDB.createRow<ResumoSemanal>({
    databaseId: APPWRITE_DATABASE_ID,
    tableId: TABLES.resumosSemanais,
    rowId: ID.unique(),
    data: { semanaInicio: inicio, semanaFim: fim, manchete, lide },
  });
}

/** Botão "Rodar monitoramento" — sem scraping real; garante o resumo da semana e recalcula números derivados. */
export async function rodarMonitoramento() {
  const { tablesDB } = await requireRole("administrador", "coordenador_relgov");
  await garantirResumoDaSemana(tablesDB);
  revalidatePath("/painel");
}

/** Botão "Enviar resumo aos gestores" — grava um EmailLog em RASCUNHO e retorna o id para a prévia. */
export async function enviarResumoAosGestores(): Promise<string> {
  const { tablesDB } = await requireRole("administrador", "coordenador_relgov");

  const resumo = await garantirResumoDaSemana(tablesDB);
  const [pautas, pendencias, movimentacoes] = await Promise.all([
    listPautas(tablesDB),
    listPendencias(tablesDB),
    listMovimentacoesRecentes(tablesDB),
  ]);
  const recentes = movimentacoesUltimos7Dias(movimentacoes);
  const { pautasComMovimentacao } = gerarResumoAutomatico(pautas, pendencias, recentes);
  const vencidas = pendenciasVencidas(pendencias);

  const { users } = createAdminClient();
  const { users: todos } = await users.list({ queries: [Query.limit(200)] });
  const destinatarios = todos
    .filter(
      (u) =>
        u.status &&
        hasRelgovAccess(u.labels) &&
        (u.prefs as Record<string, unknown>)?.receberAlertas !== false
    )
    .map((u) => u.email);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const html = renderWeeklyEmailHtml({
    resumo,
    pautasComMovimentacao,
    pendenciasVencidas: vencidas,
    numeros: {
      pautasAtivas: pautasAtivas(pautas).length,
      comMovimentacao: pautasComMovimentacao.length,
      pendenciasAbertas: pendenciasAbertas(pendencias).length,
      prazosVencidos: vencidas.length,
    },
    appUrl,
    logoUrl: `${appUrl}/abrafesta-logo.png`,
  });

  const emailLog = await tablesDB.createRow({
    databaseId: APPWRITE_DATABASE_ID,
    tableId: TABLES.emailLogs,
    rowId: ID.unique(),
    data: {
      resumoSemanalId: resumo.$id,
      destinatarios,
      assunto: `RelGov ABRAFESTA · resumo da semana`,
      htmlRenderizado: html,
      status: "RASCUNHO",
    },
  });

  revalidatePath("/painel");
  return emailLog.$id;
}
