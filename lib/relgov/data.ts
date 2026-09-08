import { AppwriteException, Query, type Storage, type TablesDB } from "node-appwrite";

import { APPWRITE_DATABASE_ID, STORAGE_BUCKET_ID, TABLES } from "@/lib/appwrite/constants";
import type {
  Anexo,
  Encaminhamento,
  EmailLog,
  Movimentacao,
  Pauta,
  Pendencia,
  PendenciaAnexo,
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
    queries: [Query.isNull("excluidoEm"), Query.limit(200)],
  });
  return toPlain(rows);
}

/** Pautas excluídas (lixeira) — ainda no banco, aguardando os 30 dias antes da exclusão definitiva. */
export async function listPautasExcluidas(tablesDB: TablesDB): Promise<Pauta[]> {
  const { rows } = await tablesDB.listRows<Pauta>({
    databaseId: APPWRITE_DATABASE_ID,
    tableId: TABLES.pautas,
    queries: [Query.isNotNull("excluidoEm"), Query.orderDesc("excluidoEm"), Query.limit(200)],
  });
  return toPlain(rows);
}

const DIAS_RETENCAO_LIXEIRA = 30;

/**
 * Exclusão definitiva de pautas na lixeira há mais de 30 dias — chamada de
 * forma "preguiçosa" (sem cron): roda a cada carregamento da lista de pautas.
 * Apaga também o que pertence só a essa pauta (movimentações, encaminhamentos,
 * anexos + arquivos no Storage); pendências vinculadas ficam (viram "institucionais").
 */
export async function purgarPautasExcluidasVencidas(
  tablesDB: TablesDB,
  storage: Storage
): Promise<number> {
  const limite = Date.now() - DIAS_RETENCAO_LIXEIRA * 24 * 60 * 60 * 1000;
  const { rows: vencidas } = await tablesDB.listRows<Pauta>({
    databaseId: APPWRITE_DATABASE_ID,
    tableId: TABLES.pautas,
    queries: [Query.isNotNull("excluidoEm"), Query.limit(200)],
  });

  let removidas = 0;
  for (const pauta of vencidas) {
    if (!pauta.excluidoEm || new Date(pauta.excluidoEm).getTime() > limite) continue;
    await excluirPautaDefinitivamente(tablesDB, storage, pauta.$id);
    removidas++;
  }
  return removidas;
}

/** Apaga a pauta e tudo que só existe em função dela (sem esperar os 30 dias). */
export async function excluirPautaDefinitivamente(
  tablesDB: TablesDB,
  storage: Storage,
  pautaId: string
): Promise<void> {
  const [{ rows: movimentacoes }, { rows: encaminhamentos }, { rows: anexosPauta }, { rows: pendencias }] =
    await Promise.all([
      tablesDB.listRows<Movimentacao>({
        databaseId: APPWRITE_DATABASE_ID,
        tableId: TABLES.movimentacoes,
        queries: [Query.equal("pautaId", pautaId), Query.limit(500)],
      }),
      tablesDB.listRows<Encaminhamento>({
        databaseId: APPWRITE_DATABASE_ID,
        tableId: TABLES.encaminhamentos,
        queries: [Query.equal("pautaId", pautaId), Query.limit(500)],
      }),
      tablesDB.listRows<Anexo>({
        databaseId: APPWRITE_DATABASE_ID,
        tableId: TABLES.anexos,
        queries: [Query.equal("pautaId", pautaId), Query.limit(500)],
      }),
      tablesDB.listRows<Pendencia>({
        databaseId: APPWRITE_DATABASE_ID,
        tableId: TABLES.pendencias,
        queries: [Query.equal("pautaId", pautaId), Query.limit(500)],
      }),
    ]);

  await Promise.all([
    ...anexosPauta.map(async (anexo) => {
      await storage.deleteFile({ bucketId: STORAGE_BUCKET_ID, fileId: anexo.fileId }).catch(() => {});
      await tablesDB.deleteRow({ databaseId: APPWRITE_DATABASE_ID, tableId: TABLES.anexos, rowId: anexo.$id });
    }),
    ...encaminhamentos.map((enc) =>
      tablesDB.deleteRow({
        databaseId: APPWRITE_DATABASE_ID,
        tableId: TABLES.encaminhamentos,
        rowId: enc.$id,
      })
    ),
    ...movimentacoes.map((mov) =>
      tablesDB.deleteRow({
        databaseId: APPWRITE_DATABASE_ID,
        tableId: TABLES.movimentacoes,
        rowId: mov.$id,
      })
    ),
    ...pendencias.map((pendencia) =>
      tablesDB.updateRow({
        databaseId: APPWRITE_DATABASE_ID,
        tableId: TABLES.pendencias,
        rowId: pendencia.$id,
        data: { pautaId: null },
      })
    ),
  ]);

  await tablesDB.deleteRow({ databaseId: APPWRITE_DATABASE_ID, tableId: TABLES.pautas, rowId: pautaId });
}

/** Trata uma pauta já excluída (na lixeira) como não encontrada — ver listPautasExcluidas/lixeira para o fluxo correto de revisar/restaurar. */
export async function getPauta(tablesDB: TablesDB, pautaId: string): Promise<Pauta> {
  const row = await tablesDB.getRow<Pauta>({
    databaseId: APPWRITE_DATABASE_ID,
    tableId: TABLES.pautas,
    rowId: pautaId,
  });
  if (row.excluidoEm) {
    throw new AppwriteException("Pauta não encontrada.", 404, "document_not_found");
  }
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
/** `pautaIds`, quando informado, filtra a busca em vez de aplicar o corte no cliente depois de já ter truncado em `limit`. */
export async function listMovimentacoesRecentes(
  tablesDB: TablesDB,
  limit = 60,
  pautaIds?: string[]
): Promise<Movimentacao[]> {
  const queries = [Query.orderDesc("data"), Query.limit(limit)];
  if (pautaIds) queries.push(Query.equal("pautaId", pautaIds));
  const { rows } = await tablesDB.listRows<Movimentacao>({
    databaseId: APPWRITE_DATABASE_ID,
    tableId: TABLES.movimentacoes,
    queries,
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

export async function listAnexosPendencia(
  tablesDB: TablesDB,
  pendenciaId: string
): Promise<PendenciaAnexo[]> {
  const { rows } = await tablesDB.listRows<PendenciaAnexo>({
    databaseId: APPWRITE_DATABASE_ID,
    tableId: TABLES.pendenciaAnexos,
    queries: [Query.equal("pendenciaId", pendenciaId), Query.limit(100)],
  });
  return toPlain(rows);
}

/** Apaga a pendência e seus anexos (arquivo no Storage + linhas). Pendência não pertence a nenhuma pauta ativamente (ver excluirPautaDefinitivamente), então não há mais nada para cascatear. */
export async function excluirPendencia(
  tablesDB: TablesDB,
  storage: Storage,
  pendenciaId: string
): Promise<void> {
  const { rows: anexosPendencia } = await tablesDB.listRows<PendenciaAnexo>({
    databaseId: APPWRITE_DATABASE_ID,
    tableId: TABLES.pendenciaAnexos,
    queries: [Query.equal("pendenciaId", pendenciaId), Query.limit(100)],
  });

  await Promise.all(
    anexosPendencia.map(async (anexo) => {
      await storage.deleteFile({ bucketId: STORAGE_BUCKET_ID, fileId: anexo.fileId }).catch(() => {});
      await tablesDB.deleteRow({
        databaseId: APPWRITE_DATABASE_ID,
        tableId: TABLES.pendenciaAnexos,
        rowId: anexo.$id,
      });
    })
  );

  await tablesDB.deleteRow({ databaseId: APPWRITE_DATABASE_ID, tableId: TABLES.pendencias, rowId: pendenciaId });
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

/** Documentos anexados diretamente a uma pauta (sem movimentação específica). */
export async function listAnexosPauta(tablesDB: TablesDB, pautaId: string): Promise<Anexo[]> {
  const { rows } = await tablesDB.listRows<Anexo>({
    databaseId: APPWRITE_DATABASE_ID,
    tableId: TABLES.anexos,
    queries: [
      Query.equal("pautaId", pautaId),
      Query.isNull("movimentacaoId"),
      Query.orderDesc("$createdAt"),
      Query.limit(100),
    ],
  });
  return toPlain(rows);
}

/** Documentos anexados a um conjunto de movimentações (feed "Tramitação" e histórico da pauta). */
export async function listAnexosPorMovimentacoes(
  tablesDB: TablesDB,
  movimentacaoIds: string[]
): Promise<Anexo[]> {
  if (movimentacaoIds.length === 0) return [];
  const { rows } = await tablesDB.listRows<Anexo>({
    databaseId: APPWRITE_DATABASE_ID,
    tableId: TABLES.anexos,
    queries: [Query.equal("movimentacaoId", movimentacaoIds), Query.limit(500)],
  });
  return toPlain(rows);
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
