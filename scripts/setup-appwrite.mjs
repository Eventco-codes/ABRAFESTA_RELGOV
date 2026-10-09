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
import { Client, Databases, Storage, TablesDB, Permission, Role, Query } from "node-appwrite";

const endpoint = requireEnv("NEXT_PUBLIC_APPWRITE_ENDPOINT");
const project = requireEnv("NEXT_PUBLIC_APPWRITE_PROJECT_ID");
const apiKey = requireEnv("APPWRITE_API_KEY");
const databaseId = process.env.APPWRITE_DATABASE_ID || "relgov";

const client = new Client().setEndpoint(endpoint).setProject(project).setKey(apiKey);
const databases = new Databases(client);
const tablesDB = new TablesDB(client);
const storage = new Storage(client);

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
      // Identificação da Proposição (dados formais, quando a pauta for uma proposição oficial)
      { type: "string", key: "autor", size: 255, required: false },
      { type: "string", key: "dataApresentacao", size: 10, required: false },
      { type: "string", key: "ementa", size: 2000, required: false },
      { type: "string", key: "dataUltimaMovimentacao", size: 10, required: false },
      // Controle manual de Tramitação + soft delete (30 dias)
      { type: "boolean", key: "incluirTramitacao", required: true, xdefault: false },
      { type: "datetime", key: "excluidoEm", required: false },
    ],
    indexes: [
      { key: "idx_ativo", type: "key", columns: ["ativo"] },
      { key: "idx_incluirTramitacao", type: "key", columns: ["incluirTramitacao"] },
      { key: "idx_excluidoEm", type: "key", columns: ["excluidoEm"] },
    ],
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
      { type: "string", key: "comentario", size: 2000, required: false },
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
    id: "anexos",
    name: "Anexos",
    permissions: [...READ_TODOS, ...ESCRITA_ADMIN_COORDENADOR],
    columns: [
      { type: "string", key: "pautaId", size: 36, required: true },
      { type: "string", key: "movimentacaoId", size: 36, required: false },
      { type: "string", key: "fileId", size: 36, required: true },
      { type: "string", key: "nome", size: 255, required: true },
      { type: "integer", key: "tamanho", required: true },
      { type: "string", key: "tipoMime", size: 120, required: false },
      { type: "string", key: "criadoPorNome", size: 255, required: false },
    ],
    indexes: [
      { key: "idx_pautaId", type: "key", columns: ["pautaId"] },
      { key: "idx_movimentacaoId", type: "key", columns: ["movimentacaoId"] },
    ],
  },
  {
    id: "pendencia_anexos",
    name: "Pendências · Anexos",
    permissions: [...READ_TODOS, ...ESCRITA_ADMIN_COORDENADOR],
    columns: [
      { type: "string", key: "pendenciaId", size: 36, required: true },
      { type: "string", key: "fileId", size: 36, required: true },
      { type: "string", key: "nome", size: 255, required: true },
      { type: "integer", key: "tamanho", required: true },
      { type: "string", key: "tipoMime", size: 120, required: false },
      { type: "string", key: "criadoPorNome", size: 255, required: false },
    ],
    indexes: [{ key: "idx_pendenciaId", type: "key", columns: ["pendenciaId"] }],
  },
  {
    id: "ministerio_projetos",
    name: "Ministério · Projetos",
    permissions: [...READ_TODOS, ...ESCRITA_ADMIN_COORDENADOR],
    columns: [
      { type: "string", key: "ministerioId", size: 64, required: true },
      { type: "string", key: "ministerioNome", size: 255, required: true },
      { type: "string", key: "titulo", size: 255, required: true },
      { type: "string", key: "data", size: 10, required: false },
      { type: "string", key: "contexto", size: 2000, required: false },
      { type: "string", key: "link", size: 500, required: false },
      { type: "string", key: "criadoPorNome", size: 255, required: false },
    ],
    indexes: [{ key: "idx_ministerioId", type: "key", columns: ["ministerioId"] }],
  },
  {
    id: "ministerio_projeto_responsaveis",
    name: "Ministério · Projeto · Responsáveis",
    permissions: [...READ_TODOS, ...ESCRITA_ADMIN_COORDENADOR],
    columns: [
      { type: "string", key: "projetoId", size: 36, required: true },
      { type: "string", key: "nome", size: 255, required: true },
      { type: "string", key: "telefone", size: 32, required: false },
      { type: "string", key: "email", size: 254, required: false },
    ],
    indexes: [{ key: "idx_projetoId", type: "key", columns: ["projetoId"] }],
  },
  {
    id: "ministerio_projeto_anexos",
    name: "Ministério · Projeto · Anexos",
    permissions: [...READ_TODOS, ...ESCRITA_ADMIN_COORDENADOR],
    columns: [
      { type: "string", key: "projetoId", size: 36, required: true },
      { type: "string", key: "fileId", size: 36, required: true },
      { type: "string", key: "nome", size: 255, required: true },
      { type: "integer", key: "tamanho", required: true },
      { type: "string", key: "tipoMime", size: 120, required: false },
      { type: "string", key: "criadoPorNome", size: 255, required: false },
    ],
    indexes: [{ key: "idx_projetoId", type: "key", columns: ["projetoId"] }],
  },
  {
    // rowId = ministerioId (1 registro por ministério). O SIORG confirma que o
    // cargo existe (Ministro de Estado / Chefe de Gabinete), mas não devolve o
    // nome de quem ocupa (nomeTitular vem sempre null na API pública) — por
    // isso esse contato é mantido manualmente pela equipe RelGov.
    id: "ministerio_direcao",
    name: "Ministério · Direção",
    permissions: [...READ_TODOS, ...ESCRITA_ADMIN_COORDENADOR],
    columns: [
      { type: "string", key: "ministroNome", size: 255, required: false },
      { type: "string", key: "ministroTelefone", size: 32, required: false },
      { type: "string", key: "ministroEmail", size: 254, required: false },
      { type: "string", key: "chefeGabineteNome", size: 255, required: false },
      { type: "string", key: "chefeGabineteTelefone", size: 32, required: false },
      { type: "string", key: "chefeGabineteEmail", size: 254, required: false },
      { type: "string", key: "atualizadoPorNome", size: 255, required: false },
    ],
    indexes: [],
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

  const BUCKET_ID = "documentos";
  await ignore409(
    () =>
      storage.createBucket({
        bucketId: BUCKET_ID,
        name: "Documentos",
        permissions: [...READ_TODOS, ...ESCRITA_ADMIN_COORDENADOR],
        fileSecurity: false,
        maximumFileSize: 15 * 1024 * 1024,
        allowedFileExtensions: ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "jpg", "jpeg", "png"],
      }),
    `bucket ${BUCKET_ID}`
  );

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

    // Colunas required não aceitam default no Appwrite — então uma coluna
    // required nova, numa tabela já populada, some (não vira null) nas linhas
    // existentes. Backfilla o xdefault declarado nelas para o script continuar
    // seguro de re-rodar contra uma tabela com dados.
    await backfillRequiredDefaults(table);

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

/** Preenche o xdefault declarado nas linhas já existentes que não têm a coluna (required nunca recebe default do Appwrite em si). */
async function backfillRequiredDefaults(table) {
  const alvo = table.columns.filter((c) => c.required && c.xdefault !== undefined);
  if (alvo.length === 0) return;

  let cursor;
  for (;;) {
    const queries = [Query.limit(100)];
    if (cursor) queries.push(Query.cursorAfter(cursor));
    const { rows } = await tablesDB.listRows({ databaseId, tableId: table.id, queries });
    if (rows.length === 0) break;

    for (const row of rows) {
      const faltando = {};
      for (const c of alvo) {
        if (row[c.key] === undefined || row[c.key] === null) faltando[c.key] = c.xdefault;
      }
      if (Object.keys(faltando).length > 0) {
        await tablesDB.updateRow({ databaseId, tableId: table.id, rowId: row.$id, data: faltando });
        console.log(`  ↺ backfill ${table.id}/${row.$id}: ${Object.keys(faltando).join(", ")}`);
      }
    }

    if (rows.length < 100) break;
    cursor = rows[rows.length - 1].$id;
  }
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
