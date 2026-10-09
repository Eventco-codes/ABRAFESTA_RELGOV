import { Query, type TablesDB } from "node-appwrite";

import { APPWRITE_DATABASE_ID } from "@/lib/appwrite/constants";
import type { RelgovRow } from "@/lib/types";

export interface Senador extends RelgovRow {
  codigoParlamentar: number;
  nome: string | null;
  nomeCompleto: string | null;
  sexo: string | null;
  formaTratamento: string | null;
  partido: string | null;
  uf: string | null;
  email: string | null;
  telefone: string | null;
  urlFoto: string | null;
  urlPagina: string | null;
  sincronizadoEm: string | null;
}

function toPlain<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

/** Todos os senadores em exercício sincronizados (ver lib/senado/sync.ts) — ~81 linhas. */
export async function listSenadores(tablesDB: TablesDB): Promise<Senador[]> {
  const { rows } = await tablesDB.listRows<Senador>({
    databaseId: APPWRITE_DATABASE_ID,
    tableId: "senado_senador",
    queries: [Query.orderAsc("nome"), Query.limit(200)],
  });
  return toPlain(rows);
}
