#!/usr/bin/env node
/**
 * Provisiona as tabelas do módulo SIORG no database `relgov` (Appwrite
 * self-hosted). Idempotente — segue o mesmo padrão de scripts/setup-appwrite.mjs.
 *
 * Adaptado para a API `TablesDB` (v17+) — o módulo original (setup-siorg-collections.mjs)
 * usava a API clássica `Databases`, incompatível com o node-appwrite instalado aqui.
 *
 * Uso: node --env-file=.env.local scripts/setup-siorg-tables.mjs
 */
import { Client, TablesDB, Permission, Role } from "node-appwrite";

const endpoint = requireEnv("NEXT_PUBLIC_APPWRITE_ENDPOINT");
const project = requireEnv("NEXT_PUBLIC_APPWRITE_PROJECT_ID");
const apiKey = requireEnv("APPWRITE_API_KEY");
const databaseId = process.env.APPWRITE_DATABASE_ID || "relgov";

const client = new Client().setEndpoint(endpoint).setProject(project).setKey(apiKey);
const tablesDB = new TablesDB(client);

const LABEL = { administrador: "administrador", coordenadorRelgov: "coordenadorrelgov", leitor: "leitor" };

// Dados públicos, só-leitura para a equipe RelGov — sincronizados via API Key (server),
// que ignora permissões de linha; escrita fica restrita ao administrador.
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
    id: "siorg_poder",
    name: "SIORG · Poder",
    columns: [
      { type: "integer", key: "codigo", required: true },
      { type: "string", key: "descricao", size: 255, required: true },
      { type: "boolean", key: "ativo", required: false, xdefault: true },
    ],
  },
  {
    id: "siorg_esfera",
    name: "SIORG · Esfera",
    columns: [
      { type: "integer", key: "codigo", required: true },
      { type: "string", key: "descricao", size: 255, required: true },
      { type: "boolean", key: "ativo", required: false, xdefault: true },
    ],
  },
  {
    id: "siorg_natureza_juridica",
    name: "SIORG · Natureza Jurídica",
    columns: [
      { type: "integer", key: "codigo", required: true },
      { type: "string", key: "descricao", size: 255, required: true },
      { type: "boolean", key: "ativo", required: false, xdefault: true },
    ],
  },
  {
    id: "siorg_subnatureza_juridica",
    name: "SIORG · Subnatureza Jurídica",
    columns: [
      { type: "integer", key: "codigo", required: true },
      { type: "string", key: "descricao", size: 255, required: true },
      { type: "string", key: "naturezaRef", size: 64, required: false },
      { type: "boolean", key: "ativo", required: false, xdefault: true },
    ],
  },
  {
    id: "siorg_tipo_unidade",
    name: "SIORG · Tipo de Unidade",
    columns: [
      { type: "string", key: "codigo", size: 16, required: true },
      { type: "string", key: "descricao", size: 255, required: true },
    ],
  },
  {
    id: "siorg_categoria_unidade",
    name: "SIORG · Categoria de Unidade",
    columns: [
      { type: "integer", key: "codigo", required: true },
      { type: "string", key: "descricao", size: 255, required: true },
      { type: "boolean", key: "ativo", required: false, xdefault: true },
    ],
  },
  {
    id: "siorg_unidade",
    name: "SIORG · Unidade Organizacional",
    columns: [
      { type: "string", key: "nome", size: 500, required: true },
      { type: "string", key: "sigla", size: 64, required: false },
      { type: "string", key: "paiRef", size: 64, required: false },
      { type: "string", key: "orgaoEntidadeRef", size: 64, required: false },
      { type: "string", key: "tipoUnidadeRef", size: 64, required: false },
      { type: "string", key: "esferaRef", size: 64, required: false },
      { type: "string", key: "poderRef", size: 64, required: false },
      { type: "string", key: "naturezaRef", size: 64, required: false },
      { type: "string", key: "subnaturezaRef", size: 64, required: false },
      { type: "string", key: "categoriaRef", size: 64, required: false },
      { type: "string", key: "nivelNormatizacao", size: 64, required: false },
      { type: "string", key: "versaoConsulta", size: 32, required: false },
      { type: "string", key: "dataInicialVersao", size: 32, required: false },
      { type: "boolean", key: "isOrgaoEntidade", required: false, xdefault: false },
      { type: "boolean", key: "ativo", required: false, xdefault: true },
    ],
    indexes: [
      { key: "idx_pai", type: "key", columns: ["paiRef"] },
      { key: "idx_orgao", type: "key", columns: ["orgaoEntidadeRef"] },
      { key: "idx_sigla", type: "key", columns: ["sigla"] },
      { key: "idx_isorgao", type: "key", columns: ["isOrgaoEntidade"] },
    ],
  },
  {
    id: "siorg_cargo_funcao",
    name: "SIORG · Cargo/Função",
    columns: [
      { type: "string", key: "denominacao", size: 500, required: false },
      { type: "string", key: "sigla", size: 64, required: false },
      { type: "string", key: "nivel", size: 32, required: false },
      { type: "string", key: "categoria", size: 128, required: false },
      { type: "integer", key: "tipoCodigo", required: false },
      { type: "string", key: "tipoNome", size: 255, required: false },
      { type: "string", key: "regraAutoridade", size: 32, required: false },
      { type: "string", key: "atoNormativoJson", size: 4000, required: false },
    ],
  },
  {
    id: "siorg_colegiado_integrante",
    name: "SIORG · Integrante de Colegiado",
    columns: [
      { type: "string", key: "colegiadoRef", size: 64, required: true },
      { type: "string", key: "unidadeRef", size: 64, required: false },
      { type: "string", key: "nome", size: 500, required: false },
      { type: "string", key: "outraRepresentatividade", size: 500, required: false },
    ],
    indexes: [{ key: "idx_colegiado", type: "key", columns: ["colegiadoRef"] }],
  },
  {
    id: "siorg_endereco_contato",
    name: "SIORG · Endereço e Contato",
    columns: [
      { type: "string", key: "logradouro", size: 500, required: false },
      { type: "string", key: "numero", size: 32, required: false },
      { type: "string", key: "complemento", size: 255, required: false },
      { type: "string", key: "bairro", size: 255, required: false },
      { type: "string", key: "cep", size: 16, required: false },
      { type: "string", key: "uf", size: 8, required: false },
      { type: "string", key: "municipio", size: 32, required: false },
      { type: "string", key: "tipoEndereco", size: 64, required: false },
      { type: "string", key: "horarioDeFuncionamento", size: 255, required: false },
      { type: "string", key: "telefonesJson", size: 500, required: false },
      { type: "string", key: "emailsJson", size: 500, required: false },
      { type: "string", key: "siteJson", size: 1000, required: false },
    ],
  },
  {
    id: "siorg_sync_meta",
    name: "SIORG · Sync Meta",
    columns: [
      { type: "string", key: "recurso", size: 64, required: true },
      { type: "string", key: "ultimaVersaoReferencia", size: 32, required: false },
      { type: "datetime", key: "ultimoSyncEm", required: false },
      { type: "string", key: "ultimoStatus", size: 32, required: false },
      { type: "integer", key: "registros", required: false },
    ],
  },
];

async function main() {
  console.log(`Provisionando tabelas SIORG no database "${databaseId}"...\n`);

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

  console.log("\nConcluído. Tabelas SIORG prontas no database", databaseId);
}

function createColumn(tableId, column) {
  const base = { databaseId, tableId, key: column.key, required: column.required };
  switch (column.type) {
    case "string":
      return tablesDB.createStringColumn({
        ...base,
        size: column.size,
        xdefault: column.required ? undefined : column.xdefault,
      });
    case "boolean":
      return tablesDB.createBooleanColumn({
        ...base,
        xdefault: column.required ? undefined : column.xdefault,
      });
    case "integer":
      return tablesDB.createIntegerColumn({
        ...base,
        xdefault: column.required ? undefined : column.xdefault,
      });
    case "datetime":
      return tablesDB.createDatetimeColumn({ ...base });
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
  console.warn(`  aviso: coluna ${tableId}.${key} ainda não está "available" após espera.`);
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
