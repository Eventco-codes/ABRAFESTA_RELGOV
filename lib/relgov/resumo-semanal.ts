import { ID, type TablesDB } from "node-appwrite";

import { APPWRITE_DATABASE_ID, TABLES } from "@/lib/appwrite/constants";
import {
  getResumoSemanalPorSemana,
  listMovimentacoesRecentes,
  listPautas,
  listPendencias,
} from "@/lib/relgov/data";
import { semanaCorrente } from "@/lib/relgov/derived";
import { gerarResumoAutomatico, movimentacoesUltimos7Dias } from "@/lib/relgov/resumo";
import type { ResumoSemanal } from "@/lib/types";

/**
 * Garante o resumo da semana corrente (cria se ainda não existir). Usado pelo botão "Rodar
 * monitoramento" (cliente com a sessão do usuário) e pela varredura semanal agendada (cliente admin).
 */
export async function garantirResumoDaSemana(tablesDB: TablesDB): Promise<ResumoSemanal> {
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
