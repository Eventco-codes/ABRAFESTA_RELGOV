#!/usr/bin/env node
/**
 * Provisiona o schema do RelGov numa instância Appwrite (self-hosted ou cloud):
 * database, tabelas, colunas, índices e permissões por Label.
 *
 * Uso:
 *   node --env-file=.env.local scripts/setup-appwrite.mjs
 *
 * Variáveis necessárias (ver .env.example):
 *   NEXT_PUBLIC_APPWRITE_ENDPOINT, NEXT_PUBLIC_APPWRITE_PROJECT_ID,
 *   APPWRITE_API_KEY, APPWRITE_DATABASE_ID (default "relgov")
 *
 * Idempotente: pode rodar de novo — recursos já existentes são pulados (409).
 */
import { Client, Databases, TablesDB, Permission, Role } from "node-appwrite";

const endpoint = requireEnv("NEXT_PUBLIC_APPWRITE_ENDPOINT");
const project = requireEnv("NEXT_PUBLIC_APPWRITE_PROJECT_ID");
const apiKey = requireEnv("APPWRITE_API_KEY");
const databaseId = process.env.APPWRITE_DATABASE_ID || "relgov";

const client = new Client().setEndpoint(endpoint).setProject(project).setKey(apiKey);
const databases = new Databases(client);
const tablesDB = new TablesDB(client);

const LABEL = {
  administrador: "administrador",
  coordenadorRelgov: "coordenadorrelgov",
  leitor: "leitor",
};

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

const ESCRITA_ADMIN_COORDENADOR = [
  Permission.create(Role.label(LABEL.administrador)),
  Permission.create(Role.label(LABEL.coordenadorRelgov)),
  Permission.update(Role.label(LABEL.administrador)),
  Permission.update(Role.label(LABEL.coordenadorRelgov)),
  Permission.delete(Role.label(LABEL.administrador)),
  Permission.delete(Role.label(LABEL.coordenadorRelgov)),
];

const TABLES = [
  {
    id: "pautas",
    name: "Pautas",
    permissions: [...READ_TODOS, ...ESCRITA_ADMIN],
    columns: [
      { type: "string", key: "titulo", size: 255, required: true },
      { type: "string", key: "eixo", size: 255, required: true },
      { type: "string", key: "atuacao", size: 2000, required: true },
      { type: "string", key: "contexto", size: 2000, required: true },
      { type: "string", key: "situacaoAtual", size: 2000, required: true },
      { type: "string", key: "interlocutores", size: 1000, required: true },
      { type: "enum", key: "prioridade", elements: ["Alta", "Media", "Baixa"], required: true },
      { type: "string", key: "fonteReferencia", size: 500, required: true },
      { type: "string", key: "status", size: 255, required: true },
      { type: "string", key: "linkOficial", size: 500, required: false },
      { type: "boolean", key: "ativo", required: true, xdefault: true },
    ],
    indexes: [{ key: "idx_ativo", type: "key", columns: ["ativo"] }],
  },
  {
    id: "encaminhamentos",
    name: "Encaminhamentos",
    permissions: [...READ_TODOS, ...ESCRITA_ADMIN_COORDENADOR],
    columns: [
      { type: "string", key: "pautaId", size: 36, required: true },
      { type: "string", key: "texto", size: 1000, required: true },
      { type: "integer", key: "ordem", required: true, xdefault: 0 },
      { type: "boolean", key: "concluido", required: true, xdefault: false },
      { type: "datetime", key: "concluidoEm", required: false },
      { type: "string", key: "concluidoPorNome", size: 255, required: false },
    ],
    indexes: [
      { key: "idx_pautaId", type: "key", columns: ["pautaId"] },
      { key: "idx_ordem", type: "key", columns: ["ordem"] },
    ],
  },
  {
    id: "pendencias",
    name: "Pendências",
    permissions: [...READ_TODOS, ...ESCRITA_ADMIN_COORDENADOR],
    columns: [
      { type: "string", key: "pautaId", size: 36, required: false },
      { type: "string", key: "descricao", size: 1000, required: true },
      { type: "string", key: "responsavel", size: 255, required: true },
      { type: "string", key: "ultimaMovimentacao", size: 10, required: true },
      { type: "string", key: "status", size: 255, required: true },
      { type: "enum", key: "prioridade", elements: ["Alta", "Media", "Baixa"], required: true },
      { type: "string", key: "proximaCobranca", size: 1000, required: true },
      { type: "string", key: "prazoSugerido", size: 10, required: true },
      { type: "string", key: "evidencia", size: 500, required: false },
      { type: "string", key: "observacoes", size: 2000, required: false },
    ],
    indexes: [
      { key: "idx_pautaId", type: "key", columns: ["pautaId"] },
      { key: "idx_prazo", type: "key", columns: ["prazoSugerido"] },
    ],
  },
  {
    id: "movimentacoes",
    name: "Movimentações",
    permissions: [...READ_TODOS, ...ESCRITA_ADMIN_COORDENADOR],
    columns: [
      { type: "string", key: "pautaId", size: 36, required: true },
      { type: "datetime", key: "data", required: true },
      {
        type: "enum",
        key: "origem",
        elements: ["VARREDURA_AUTOMATICA", "REGISTRO_MANUAL"],
        required: true,
      },
      { type: "string", key: "titulo", size: 255, required: true },
      { type: "string", key: "descricao", size: 2000, required: true },
      { type: "string", key: "criadoPorNome", size: 255, required: false },
    ],
    indexes: [
      { key: "idx_pautaId", type: "key", columns: ["pautaId"] },
      { key: "idx_data", type: "key", columns: ["data"] },
    ],
  },
  {
    id: "resumos_semanais",
    name: "Resumos semanais",
    permissions: [...READ_TODOS, ...ESCRITA_ADMIN_COORDENADOR],
    columns: [
      { type: "string", key: "semanaInicio", size: 10, required: true },
      { type: "string", key: "semanaFim", size: 10, required: true },
      { type: "string", key: "manchete", size: 500, required: true },
      { type: "string", key: "lide", size: 2000, required: true },
    ],
    indexes: [{ key: "idx_semanaInicio", type: "key", columns: ["semanaInicio"] }],
  },
  {
    id: "email_logs",
    name: "Email logs",
    permissions: [
      Permission.read(Role.label(LABEL.administrador)),
      Permission.read(Role.label(LABEL.coordenadorRelgov)),
      ...ESCRITA_ADMIN_COORDENADOR,
    ],
    columns: [
      { type: "string", key: "resumoSemanalId", size: 36, required: true },
      { type: "string", key: "destinatarios", size: 255, required: false, array: true },
      { type: "string", key: "assunto", size: 255, required: true },
      { type: "string", key: "htmlRenderizado", size: 100000, required: true },
      { type: "enum", key: "status", elements: ["RASCUNHO", "ENVIADO", "FALHA"], required: true },
    ],
    indexes: [{ key: "idx_resumoSemanalId", type: "key", columns: ["resumoSemanalId"] }],
  },
];

async function main() {
  console.log(`Endpoint: ${endpoint}`);
  console.log(`Projeto: ${project}`);
  console.log(`Database: ${databaseId}\n`);

  await ignore409(() => databases.create({ databaseId, name: "RelGov" }), "database relgov");

  for (const table of TABLES) {
    await ignore409(
      () =>
        tablesDB.createTable({
          databaseId,
          tableId: table.id,
          name: table.name,
          permissions: table.permissions,
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

    for (const index of table.indexes) {
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

  console.log("\nSchema provisionado. Próximo passo: node --env-file=.env.local scripts/seed.mjs");
}

function createColumn(tableId, column) {
  const base = { databaseId, tableId, key: column.key, required: column.required };
  switch (column.type) {
    case "string":
      return tablesDB.createStringColumn({
        ...base,
        size: column.size,
        xdefault: column.required ? undefined : column.xdefault,
        array: column.array ?? false,
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
    case "enum":
      return tablesDB.createEnumColumn({ ...base, elements: column.elements });
    default:
      throw new Error(`Tipo de coluna desconhecido: ${column.type}`);
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
