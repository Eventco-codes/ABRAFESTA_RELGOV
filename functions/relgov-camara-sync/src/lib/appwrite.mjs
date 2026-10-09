/**
 * appwrite.mjs — Camada Appwrite: cliente, provisionamento e upsert.
 *
 * Adaptado para a API `TablesDB` do node-appwrite (v17+) — a mesma usada no
 * resto do RelGov (ver scripts/setup-appwrite.mjs). "Coleção" do schema.mjs
 * vira tabela, "atributo" vira coluna, "documento" vira linha; os nomes
 * públicos deste módulo (ensureCollection, upsert, makeDatabases) foram
 * mantidos para não exigir mudanças em sync.mjs/run.mjs/main.mjs.
 *
 * As escritas são feitas com a API Key (server), que ignora as permissões de
 * linha; por isso as tabelas são criadas com leitura para usuários
 * autenticados e escrita apenas via servidor. Para restringir a um time do
 * Appwrite, troque Role.users() por Role.team('relgov') em COLLECTION_PERMS.
 */

import { Client, TablesDB, Permission, Role } from 'node-appwrite';
import { sleep } from './camara.mjs';

export function getConfig() {
  // Aceita tanto os nomes do RelGov (.env.local) quanto os injetados por uma
  // Appwrite Function (APPWRITE_FUNCTION_API_ENDPOINT / _PROJECT_ID).
  const endpoint =
    process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ||
    process.env.APPWRITE_FUNCTION_API_ENDPOINT ||
    process.env.APPWRITE_ENDPOINT;
  const project =
    process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID ||
    process.env.APPWRITE_FUNCTION_PROJECT_ID ||
    process.env.APPWRITE_PROJECT_ID;
  const apiKey = process.env.APPWRITE_API_KEY; // opcional: pode vir da chave dinâmica
  const databaseId = process.env.APPWRITE_DATABASE_ID || 'relgov';

  const missing = [];
  if (!endpoint) missing.push('NEXT_PUBLIC_APPWRITE_ENDPOINT (ou APPWRITE_FUNCTION_API_ENDPOINT)');
  if (!project) missing.push('NEXT_PUBLIC_APPWRITE_PROJECT_ID (ou APPWRITE_FUNCTION_PROJECT_ID)');
  if (missing.length) {
    throw new Error(
      `Variáveis de ambiente ausentes: ${missing.join(', ')}. ` +
      'Rode com `node --env-file=.env.local ...` ou exporte-as antes.',
    );
  }
  return { endpoint, project, apiKey, databaseId };
}

/**
 * @param {{apiKey?:string}} [opts] chave a usar (ex.: chave dinâmica de uma
 *   Appwrite Function via header x-appwrite-key). Sem ela, usa APPWRITE_API_KEY.
 */
export function makeDatabases(opts = {}) {
  const { endpoint, project } = getConfig();
  const apiKey = opts.apiKey || process.env.APPWRITE_API_KEY;
  if (!apiKey) {
    throw new Error(
      'Sem API key: defina APPWRITE_API_KEY ou passe uma chave (ex.: chave dinâmica da Function).',
    );
  }
  const client = new Client().setEndpoint(endpoint).setProject(project).setKey(apiKey);
  const db = new TablesDB(client);
  if (typeof db.createTable !== 'function') {
    throw new Error(
      'Este node-appwrite não expõe TablesDB.createTable (SDK incompatível). ' +
      'Instale uma versão v17+ (ex.: `npm i node-appwrite@28`, a mesma do restante do RelGov).',
    );
  }
  return db;
}

const COLLECTION_PERMS = [Permission.read(Role.users())];

function isCode(err, code) {
  return err && (err.code === code || err.response?.code === code);
}

async function createColumn(db, dbId, tableId, a) {
  const req = a.required ?? false;
  const def = req ? undefined : (a.default ?? null); // coluna required não aceita default
  const arr = a.array ?? false;
  const base = { databaseId: dbId, tableId, key: a.key, required: req };
  switch (a.type) {
    case 'string':
      return db.createStringColumn({ ...base, size: a.size ?? 255, xdefault: def, array: arr });
    case 'integer':
      return db.createIntegerColumn({ ...base, xdefault: def, array: arr });
    case 'double':
      return db.createFloatColumn({ ...base, xdefault: def, array: arr });
    case 'boolean':
      return db.createBooleanColumn({ ...base, xdefault: def, array: arr });
    case 'datetime':
      return db.createDatetimeColumn({ ...base, xdefault: def, array: arr });
    case 'email':
      return db.createEmailColumn({ ...base, xdefault: def, array: arr });
    case 'url':
      return db.createUrlColumn({ ...base, xdefault: def, array: arr });
    default:
      throw new Error(`Tipo de coluna desconhecido: ${a.type} (${a.key})`);
  }
}

async function waitForColumns(db, dbId, tableId, keys, { timeoutMs = 90000 } = {}) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const list = (await db.listColumns({ databaseId: dbId, tableId })).columns ?? [];
    const status = Object.fromEntries(list.map((c) => [c.key, c.status]));
    const pending = keys.filter((k) => status[k] !== 'available');
    if (pending.length === 0) return;
    const failed = list.filter((c) => c.status === 'failed').map((c) => c.key);
    if (failed.length) throw new Error(`Colunas falharam em ${tableId}: ${failed.join(', ')}`);
    await sleep(1000);
  }
  throw new Error(`Timeout aguardando colunas de ${tableId} ficarem 'available'.`);
}

/** Garante uma tabela (cria tabela, colunas e índices que faltarem). */
export async function ensureCollection(db, dbId, col, log = console.log) {
  // tabela
  try {
    await db.getTable({ databaseId: dbId, tableId: col.id });
  } catch (err) {
    if (isCode(err, 404)) {
      await db.createTable({
        databaseId: dbId,
        tableId: col.id,
        name: col.name,
        permissions: COLLECTION_PERMS,
        rowSecurity: false,
      });
      log(`  + tabela '${col.id}' criada`);
    } else {
      throw err;
    }
  }

  // colunas
  const existingCols = ((await db.listColumns({ databaseId: dbId, tableId: col.id })).columns ?? []).map(
    (c) => c.key,
  );
  const toCreate = col.attributes.filter((a) => !existingCols.includes(a.key));
  for (const a of toCreate) {
    await createColumn(db, dbId, col.id, a);
    await sleep(350); // evita rate-limit na criação de colunas
  }
  if (toCreate.length) {
    await waitForColumns(db, dbId, col.id, col.attributes.map((a) => a.key));
    log(`  + ${toCreate.length} coluna(s) em '${col.id}'`);
  }

  // índices
  const existingIdx = ((await db.listIndexes({ databaseId: dbId, tableId: col.id })).indexes ?? []).map(
    (i) => i.key,
  );
  for (const idx of col.indexes ?? []) {
    if (existingIdx.includes(idx.key)) continue;
    try {
      await db.createIndex({
        databaseId: dbId,
        tableId: col.id,
        key: idx.key,
        type: idx.type,
        columns: idx.attributes,
        orders: idx.orders,
      });
      await sleep(300);
    } catch (err) {
      if (!isCode(err, 409)) throw err;
    }
  }
}

/**
 * Upsert idempotente por $id determinístico.
 * Cria; em conflito (409) atualiza. Retorna { created:boolean }.
 */
export async function upsert(db, dbId, cid, docId, data) {
  const id = String(docId);
  try {
    await db.createRow({ databaseId: dbId, tableId: cid, rowId: id, data });
    return { created: true };
  } catch (err) {
    if (isCode(err, 409)) {
      await db.updateRow({ databaseId: dbId, tableId: cid, rowId: id, data });
      return { created: false };
    }
    throw err;
  }
}
