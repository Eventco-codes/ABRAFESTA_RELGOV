import { Query, type TablesDB } from "node-appwrite";

import { APPWRITE_DATABASE_ID, TABLES } from "@/lib/appwrite/constants";
import type {
  Encaminhamento,
  EmailLog,
  Movimentacao,
  Pauta,
  Pendencia,
  ResumoSemanal,
} from "@/lib/types";

/**
 * As rows que o node-appwrite retorna não são objetos "plain" no sentido
 * que o Next.js exige para atravessar a fronteira Server → Client Component
 * (telas passam pautas/pendências/encaminhamentos direto para formulários e
 * itens de checklist que são Client Components). Este round-trip garante um
 * POJO de verdade.
 */
function toPlain<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

/**
 * Carrega todas as pautas (o volume real é ~22 registros — ver relgov-data.json)
 * e deixa filtro/busca/ordenação por conta do chamador (ver lib/relgov/filters.ts).
 * Evita depender de índices compostos no Appwrite para combinações de filtro
 * que mudam a cada interação na tela de lista (1d).
 */
export async function listPautas(tablesDB: TablesDB): Promise<Pauta[]> {
  const { rows } = await tablesDB.listRows<Pauta>({
    databaseId: APPWRITE_DATABASE_ID,
    tableId: TABLES.pautas,
    queries: [Query.limit(200)],
  });
  return toPlain(rows);
}

export async function getPauta(tablesDB: TablesDB, pautaId: string): Promise<Pauta> {
  const row = await tablesDB.getRow<Pauta>({
    databaseId: APPWRITE_DATABASE_ID,
    tableId: TABLES.pautas,
    rowId: pautaId,
  });
  return toPlain(row);
}

export async function listEncaminhamentos(
  tablesDB: TablesDB,
  pautaId: string
): Promise<Encaminhamento[]> {
  const { rows } = await tablesDB.listRows<Encaminhamento>({
    databaseId: APPWRITE_DATABASE_ID,
    tableId: TABLES.encaminhamentos,
    queries: [Query.equal("pautaId", pautaId), Query.orderAsc("ordem"), Query.limit(100)],
  });
  return toPlain(rows);
}

export async function listMovimentacoes(
  tablesDB: TablesDB,
  pautaId: string
): Promise<Movimentacao[]> {
  const { rows } = await tablesDB.listRows<Movimentacao>({
    databaseId: APPWRITE_DATABASE_ID,
    tableId: TABLES.movimentacoes,
    queries: [Query.equal("pautaId", pautaId), Query.orderDesc("data"), Query.limit(100)],
  });
  return toPlain(rows);
}

/** Feed cross-pauta (nav "Tramitação") — últimas movimentações registradas, de qualquer pauta. */
export async function listMovimentacoesRecentes(
  tablesDB: TablesDB,
  limit = 60
): Promise<Movimentacao[]> {
  const { rows } = await tablesDB.listRows<Movimentacao>({
    databaseId: APPWRITE_DATABASE_ID,
    tableId: TABLES.movimentacoes,
    queries: [Query.orderDesc("data"), Query.limit(limit)],
  });
  return toPlain(rows);
}

export async function getPendencia(tablesDB: TablesDB, pendenciaId: string): Promise<Pendencia> {
  const row = await tablesDB.getRow<Pendencia>({
    databaseId: APPWRITE_DATABASE_ID,
    tableId: TABLES.pendencias,
    rowId: pendenciaId,
  });
  return toPlain(row);
}

export async function listPendencias(
  tablesDB: TablesDB,
  filtro: { pautaId?: string } = {}
): Promise<Pendencia[]> {
  const queries = [Query.orderAsc("prazoSugerido"), Query.limit(200)];
  if (filtro.pautaId) queries.push(Query.equal("pautaId", filtro.pautaId));

  const { rows } = await tablesDB.listRows<Pendencia>({
    databaseId: APPWRITE_DATABASE_ID,
    tableId: TABLES.pendencias,
    queries,
  });
  return toPlain(rows);
}

export async function listResumosSemanais(tablesDB: TablesDB): Promise<ResumoSemanal[]> {
  const { rows } = await tablesDB.listRows<ResumoSemanal>({
    databaseId: APPWRITE_DATABASE_ID,
    tableId: TABLES.resumosSemanais,
    queries: [Query.orderDesc("semanaInicio"), Query.limit(20)],
  });
  return toPlain(rows);
}

export async function getResumoSemanalPorSemana(
  tablesDB: TablesDB,
  semanaInicio: string
): Promise<ResumoSemanal | null> {
  const { rows } = await tablesDB.listRows<ResumoSemanal>({
    databaseId: APPWRITE_DATABASE_ID,
    tableId: TABLES.resumosSemanais,
    queries: [Query.equal("semanaInicio", semanaInicio), Query.limit(1)],
  });
  return rows[0] ? toPlain(rows[0]) : null;
}

export async function listEmailLogs(
  tablesDB: TablesDB,
  resumoSemanalId?: string
): Promise<EmailLog[]> {
  const queries = [Query.orderDesc("$createdAt"), Query.limit(20)];
  if (resumoSemanalId) queries.push(Query.equal("resumoSemanalId", resumoSemanalId));
  const { rows } = await tablesDB.listRows<EmailLog>({
    databaseId: APPWRITE_DATABASE_ID,
    tableId: TABLES.emailLogs,
    queries,
  });
  return toPlain(rows);
}
