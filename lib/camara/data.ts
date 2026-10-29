import { Query, type TablesDB } from "node-appwrite";

import { APPWRITE_DATABASE_ID, CAMARA_TABLES } from "@/lib/appwrite/constants";
import type { Deputado } from "@/lib/camara/types";

function toPlain<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

/** Todos os deputados sincronizados (ver scripts/camara/) — ~647 linhas, cabe numa página. */
export async function listDeputados(tablesDB: TablesDB): Promise<Deputado[]> {
  const { rows } = await tablesDB.listRows<Deputado>({
    databaseId: APPWRITE_DATABASE_ID,
    tableId: CAMARA_TABLES.deputados,
    queries: [Query.orderAsc("nome"), Query.limit(1000)],
  });
  return toPlain(rows);
}
