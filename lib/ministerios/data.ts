import { Query, type TablesDB } from "node-appwrite";

import { APPWRITE_DATABASE_ID, TABLES } from "@/lib/appwrite/constants";
import type {
  MinisterioDirecao,
  MinisterioProjeto,
  MinisterioProjetoAnexo,
  MinisterioProjetoResponsavel,
} from "@/lib/types";

function toPlain<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

/** null quando a equipe ainda não cadastrou o contato deste ministério. */
export async function getDirecaoMinisterio(
  tablesDB: TablesDB,
  ministerioId: string
): Promise<MinisterioDirecao | null> {
  try {
    const row = await tablesDB.getRow<MinisterioDirecao>({
      databaseId: APPWRITE_DATABASE_ID,
      tableId: TABLES.ministerioDirecao,
      rowId: ministerioId,
    });
    return toPlain(row);
  } catch {
    return null;
  }
}

export async function listProjetosMinisterio(
  tablesDB: TablesDB,
  ministerioId: string
): Promise<MinisterioProjeto[]> {
  const { rows } = await tablesDB.listRows<MinisterioProjeto>({
    databaseId: APPWRITE_DATABASE_ID,
    tableId: TABLES.ministerioProjetos,
    queries: [
      Query.equal("ministerioId", ministerioId),
      Query.orderDesc("$createdAt"),
      Query.limit(200),
    ],
  });
  return toPlain(rows);
}

export async function listResponsaveisProjetos(
  tablesDB: TablesDB,
  projetoIds: string[]
): Promise<MinisterioProjetoResponsavel[]> {
  if (projetoIds.length === 0) return [];
  const { rows } = await tablesDB.listRows<MinisterioProjetoResponsavel>({
    databaseId: APPWRITE_DATABASE_ID,
    tableId: TABLES.ministerioProjetoResponsaveis,
    queries: [Query.equal("projetoId", projetoIds), Query.limit(500)],
  });
  return toPlain(rows);
}

export async function listAnexosProjetos(
  tablesDB: TablesDB,
  projetoIds: string[]
): Promise<MinisterioProjetoAnexo[]> {
  if (projetoIds.length === 0) return [];
  const { rows } = await tablesDB.listRows<MinisterioProjetoAnexo>({
    databaseId: APPWRITE_DATABASE_ID,
    tableId: TABLES.ministerioProjetoAnexos,
    queries: [Query.equal("projetoId", projetoIds), Query.limit(500)],
  });
  return toPlain(rows);
}
