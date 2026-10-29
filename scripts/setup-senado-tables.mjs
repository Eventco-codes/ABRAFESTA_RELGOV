#!/usr/bin/env node
/**
 * Provisiona as tabelas do módulo Senado no database `relgov` (Appwrite
 * self-hosted). Idempotente — segue o padrão de scripts/setup-appwrite.mjs.
 *
 * Adaptado para a API `TablesDB` (v17+) — o módulo original
 * (setup-senado-collections.mjs) usava a API clássica `Databases`,
 * incompatível com o node-appwrite instalado aqui. Inclui também a tabela
 * `senado_senador` (cadastro + contato), que não faz parte do módulo de
 * Processo entregue — ver lib/senado/sync.ts.
 *
 * Uso: node --env-file=.env.local scripts/setup-senado-tables.mjs
 */
import { Client, TablesDB, Permission, Role } from "node-appwrite";

const endpoint = requireEnv("NEXT_PUBLIC_APPWRITE_ENDPOINT");
const project = requireEnv("NEXT_PUBLIC_APPWRITE_PROJECT_ID");
const apiKey = requireEnv("APPWRITE_API_KEY");
const databaseId = process.env.APPWRITE_DATABASE_ID || "relgov";

const client = new Client().setEndpoint(endpoint).setProject(project).setKey(apiKey);
const tablesDB = new TablesDB(client);

const LABEL = { administrador: "administrador", coordenadorRelgov: "coordenadorrelgov", leitor: "leitor" };
const READ_TODOS = [
  Permission.read(Role.label(LABEL.administrador)),
  Permission.read(Role.label(LABEL.coordenadorRelgov)),
  Permission.read(Role.label(LABEL.leitor)),
];
const ESCRITA_ADMIN = [
  Permission.create(Role.label(LABEL.administrador)),
  Permission.update(Role.label(LABEL.administrador)),
  Permission.delete(Role.label(LABEL.administrador)),
];
const PERMS = [...READ_TODOS, ...ESCRITA_ADMIN];

const TABLES = [
  {
    id: "senado_processo",
    name: "Senado · Processo",
    columns: [
      { type: "integer", key: "idProcesso", required: true },
      { type: "integer", key: "codigoMateria", required: false },
      { type: "string", key: "identificacao", size: 128, required: false },
      { type: "string", key: "apelido", size: 255, required: false },
      { type: "string", key: "ementa", size: 4000, required: false },
      { type: "string", key: "autoria", size: 500, required: false },
      { type: "string", key: "casaIdentificadora", size: 8, required: false },
      { type: "string", key: "tipoDocumento", size: 128, required: false },
      { type: "string", key: "situacaoAtual", size: 255, required: false },
      { type: "boolean", key: "tramitando", required: false },
      { type: "string", key: "dataApresentacao", size: 32, required: false },
      { type: "string", key: "dataSituacaoAtual", size: 32, required: false },
      { type: "string", key: "normaGerada", size: 255, required: false },
      { type: "string", key: "urlDocumento", size: 500, required: false },
      { type: "datetime", key: "dataUltimaAtualizacao", required: false },
      { type: "datetime", key: "sincronizadoEm", required: false },
    ],
    indexes: [
      { key: "idx_tramitando", type: "key", columns: ["tramitando"] },
      { key: "idx_situacao", type: "key", columns: ["situacaoAtual"] },
      { key: "idx_identificacao", type: "key", columns: ["identificacao"] },
      { key: "idx_atualizacao", type: "key", columns: ["dataUltimaAtualizacao"] },
    ],
  },
  {
    id: "senado_relatoria",
    name: "Senado · Relatoria",
    columns: [
      { type: "integer", key: "idRelatoria", required: true },
      { type: "integer", key: "idProcesso", required: false },
      { type: "string", key: "identificacaoProcesso", size: 128, required: false },
      { type: "string", key: "descricaoTipoRelator", size: 128, required: false },
      { type: "string", key: "dataDesignacao", size: 32, required: false },
      { type: "string", key: "dataDestituicao", size: 32, required: false },
      { type: "integer", key: "codigoParlamentar", required: false },
      { type: "string", key: "nomeParlamentar", size: 255, required: false },
      { type: "string", key: "siglaPartidoParlamentar", size: 32, required: false },
      { type: "string", key: "ufParlamentar", size: 8, required: false },
      { type: "string", key: "siglaColegiado", size: 64, required: false },
      { type: "string", key: "nomeColegiado", size: 255, required: false },
      { type: "string", key: "siglaCasa", size: 8, required: false },
      { type: "boolean", key: "tramitando", required: false },
    ],
    indexes: [
      { key: "idx_processo", type: "key", columns: ["idProcesso"] },
      { key: "idx_parlamentar", type: "key", columns: ["codigoParlamentar"] },
    ],
  },
  {
    id: "senado_prazo",
    name: "Senado · Prazo",
    columns: [
      { type: "integer", key: "idPrazo", required: true },
      { type: "integer", key: "idProcesso", required: false },
      { type: "string", key: "tipoPrazo", size: 255, required: false },
      { type: "string", key: "fundamentoLegal", size: 500, required: false },
      { type: "string", key: "siglaColegiado", size: 64, required: false },
      { type: "string", key: "descricaoTipoFase", size: 255, required: false },
      { type: "boolean", key: "prorrogado", required: false },
      { type: "string", key: "inicioPrazo", size: 32, required: false },
      { type: "string", key: "fimPrazo", size: 32, required: false },
    ],
    indexes: [
      { key: "idx_processo", type: "key", columns: ["idProcesso"] },
      { key: "idx_fim", type: "key", columns: ["fimPrazo"] },
    ],
  },
  {
    id: "senado_documento",
    name: "Senado · Documento",
    columns: [
      { type: "integer", key: "idDocumento", required: true },
      { type: "string", key: "identificacao", size: 128, required: false },
      { type: "string", key: "siglaTipo", size: 32, required: false },
      { type: "string", key: "descricaoTipo", size: 128, required: false },
      { type: "string", key: "autoria", size: 500, required: false },
      { type: "string", key: "descricao", size: 2000, required: false },
      { type: "string", key: "urlDocumento", size: 500, required: false },
      { type: "string", key: "dataDocumento", size: 32, required: false },
      { type: "string", key: "processosJson", size: 4000, required: false },
    ],
  },
  {
    id: "senado_emenda",
    name: "Senado · Emenda",
    columns: [
      { type: "integer", key: "idEmenda", required: true },
      { type: "integer", key: "idProcesso", required: false },
      { type: "string", key: "identificacao", size: 128, required: false },
      { type: "string", key: "numero", size: 32, required: false },
      { type: "string", key: "tipo", size: 128, required: false },
      { type: "string", key: "autoria", size: 500, required: false },
      { type: "string", key: "siglaColegiado", size: 64, required: false },
      { type: "string", key: "dataApresentacao", size: 32, required: false },
      { type: "string", key: "urlDocumentoEmenda", size: 500, required: false },
    ],
    indexes: [{ key: "idx_processo", type: "key", columns: ["idProcesso"] }],
  },
  {
    id: "senado_dominio",
    name: "Senado · Domínio",
    columns: [
      { type: "string", key: "tabela", size: 64, required: true },
      { type: "string", key: "sigla", size: 64, required: false },
      { type: "string", key: "descricao", size: 1000, required: false },
      { type: "integer", key: "codigo", required: false },
    ],
    indexes: [{ key: "idx_tabela", type: "key", columns: ["tabela"] }],
  },
  {
    id: "senado_senador",
    name: "Senado · Senador",
    columns: [
      { type: "integer", key: "codigoParlamentar", required: true },
      { type: "string", key: "nome", size: 255, required: false },
      { type: "string", key: "nomeCompleto", size: 255, required: false },
      { type: "string", key: "sexo", size: 16, required: false },
      { type: "string", key: "formaTratamento", size: 32, required: false },
      { type: "string", key: "partido", size: 32, required: false },
      { type: "string", key: "uf", size: 8, required: false },
      { type: "string", key: "email", size: 254, required: false },
      { type: "string", key: "telefone", size: 32, required: false },
      { type: "string", key: "urlFoto", size: 500, required: false },
      { type: "string", key: "urlPagina", size: 500, required: false },
      { type: "datetime", key: "sincronizadoEm", required: false },
    ],
    indexes: [
      { key: "idx_partido", type: "key", columns: ["partido"] },
      { key: "idx_uf", type: "key", columns: ["uf"] },
    ],
  },
  {
    id: "senado_sync_meta",
    name: "Senado · Sync Meta",
    columns: [
      { type: "string", key: "recurso", size: 64, required: true },
      { type: "datetime", key: "ultimoSyncEm", required: false },
      { type: "string", key: "ultimoStatus", size: 32, required: false },
      { type: "integer", key: "registros", required: false },
    ],
  },
];

async function main() {
  console.log(`Provisionando tabelas Senado no database "${databaseId}"...\n`);

  for (const table of TABLES) {
    await ignore409(
      () =>
        tablesDB.createTable({
          databaseId,
          tableId: table.id,
          name: table.name,
          permissions: PERMS,
          rowSecurity: false,
        }),
      `tabela ${table.id}`
    );

    for (const column of table.columns) {
      await ignore409(() => createColumn(table.id, column), `coluna ${table.id}.${column.key}`);
    }
    for (const column of table.columns) {
      await waitColumnReady(table.id, column.key);
    }
    for (const index of table.indexes ?? []) {
      await ignore409(
        () =>
          tablesDB.createIndex({
            databaseId,
            tableId: table.id,
            key: index.key,
            type: index.type,
            columns: index.columns,
          }),
        `índice ${table.id}.${index.key}`
      );
    }
  }

  console.log("\nConcluído. Tabelas Senado prontas no database", databaseId);
}

function createColumn(tableId, column) {
  const base = { databaseId, tableId, key: column.key, required: column.required };
  switch (column.type) {
    case "string":
      return tablesDB.createStringColumn({ ...base, size: column.size });
    case "boolean":
      return tablesDB.createBooleanColumn(base);
    case "integer":
      return tablesDB.createIntegerColumn(base);
    case "datetime":
      return tablesDB.createDatetimeColumn(base);
    default:
      throw new Error(`Tipo de coluna desconhecido: ${column.type} (${column.key})`);
  }
}

async function waitColumnReady(tableId, key, tentativas = 20) {
  for (let i = 0; i < tentativas; i++) {
    const col = await tablesDB.getColumn({ databaseId, tableId, key });
    if (col.status === "available") return;
    if (col.status === "failed") throw new Error(`Coluna ${tableId}.${key} falhou ao criar.`);
    await new Promise((r) => setTimeout(r, 750));
  }
  console.warn(`  aviso: coluna ${tableId}.${key} ainda não está 'available' após espera.`);
}

async function ignore409(fn, label) {
  try {
    await fn();
    console.log(`✓ ${label}`);
  } catch (err) {
    if (err?.code === 409) {
      console.log(`· ${label} (já existe)`);
      return;
    }
    console.error(`✗ ${label}:`, err?.message ?? err);
    throw err;
  }
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`Faltando variável de ambiente: ${name}`);
    process.exit(1);
  }
  return value;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
