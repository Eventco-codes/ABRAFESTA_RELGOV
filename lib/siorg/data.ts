import { Query, type TablesDB } from "node-appwrite";

import { APPWRITE_DATABASE_ID, SIORG_TABLES } from "@/lib/appwrite/constants";
import type { RelgovRow } from "@/lib/types";

function toPlain<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

export interface SiorgUnidade extends RelgovRow {
  nome: string;
  sigla: string | null;
  paiRef: string | null;
  orgaoEntidadeRef: string | null;
  tipoUnidadeRef: string | null;
  esferaRef: string | null;
  poderRef: string | null;
  naturezaRef: string | null;
  subnaturezaRef: string | null;
  categoriaRef: string | null;
  nivelNormatizacao: string | null;
  versaoConsulta: string | null;
  dataInicialVersao: string | null;
  isOrgaoEntidade: boolean;
  ativo: boolean;
}

export interface SiorgDominio extends RelgovRow {
  codigo: string | number;
  descricao: string;
  ativo?: boolean;
}

export interface SiorgEnderecoContato extends RelgovRow {
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cep: string | null;
  uf: string | null;
  municipio: string | null;
  tipoEndereco: string | null;
  horarioDeFuncionamento: string | null;
  telefonesJson: string | null;
  emailsJson: string | null;
  siteJson: string | null;
}

export interface SiorgSyncMeta extends RelgovRow {
  recurso: string;
  ultimaVersaoReferencia: string | null;
  ultimoSyncEm: string | null;
  ultimoStatus: string | null;
  registros: number | null;
}

/** Órgãos e entidades (topo da estrutura) já sincronizados — ver lib/siorg/sync.ts. */
export async function listOrgaosEntidades(tablesDB: TablesDB): Promise<SiorgUnidade[]> {
  const { rows } = await tablesDB.listRows<SiorgUnidade>({
    databaseId: APPWRITE_DATABASE_ID,
    tableId: SIORG_TABLES.unidade,
    queries: [Query.equal("isOrgaoEntidade", true), Query.equal("ativo", true), Query.orderAsc("nome"), Query.limit(1000)],
  });
  return toPlain(rows);
}

export async function getUnidade(tablesDB: TablesDB, unidadeId: string): Promise<SiorgUnidade> {
  const row = await tablesDB.getRow<SiorgUnidade>({
    databaseId: APPWRITE_DATABASE_ID,
    tableId: SIORG_TABLES.unidade,
    rowId: unidadeId,
  });
  return toPlain(row);
}

/** Tabela de domínio inteira (poder/esfera/natureza/categoria/tipo — todas pequenas). */
export async function listDominio(tablesDB: TablesDB, tableId: string): Promise<SiorgDominio[]> {
  const { rows } = await tablesDB.listRows<SiorgDominio>({
    databaseId: APPWRITE_DATABASE_ID,
    tableId,
    queries: [Query.limit(500)],
  });
  return toPlain(rows);
}

/** Nº de unidades subordinadas diretas (paiRef = orgaoId) — usa `total`, sem carregar as linhas. */
export async function contarSubordinadas(tablesDB: TablesDB, orgaoId: string): Promise<number> {
  const { total } = await tablesDB.listRows({
    databaseId: APPWRITE_DATABASE_ID,
    tableId: SIORG_TABLES.unidade,
    queries: [Query.equal("paiRef", orgaoId), Query.limit(1)],
  });
  return total;
}

/** Unidades subordinadas diretas (paiRef = orgaoId) — para achar o Gabinete do Ministro. */
export async function listSubordinadasDiretas(
  tablesDB: TablesDB,
  orgaoId: string
): Promise<SiorgUnidade[]> {
  const { rows } = await tablesDB.listRows<SiorgUnidade>({
    databaseId: APPWRITE_DATABASE_ID,
    tableId: SIORG_TABLES.unidade,
    queries: [Query.equal("paiRef", orgaoId), Query.limit(500)],
  });
  return toPlain(rows);
}

/** null quando o órgão ainda não foi tocado pelo sync de endereço/contato. */
export async function getEnderecoContato(
  tablesDB: TablesDB,
  unidadeId: string
): Promise<SiorgEnderecoContato | null> {
  try {
    const row = await tablesDB.getRow<SiorgEnderecoContato>({
      databaseId: APPWRITE_DATABASE_ID,
      tableId: SIORG_TABLES.enderecoContato,
      rowId: unidadeId,
    });
    return toPlain(row);
  } catch {
    return null;
  }
}

export async function getSyncMeta(tablesDB: TablesDB, recurso: string): Promise<SiorgSyncMeta | null> {
  try {
    const row = await tablesDB.getRow<SiorgSyncMeta>({
      databaseId: APPWRITE_DATABASE_ID,
      tableId: SIORG_TABLES.syncMeta,
      rowId: recurso,
    });
    return toPlain(row);
  } catch {
    return null;
  }
}
