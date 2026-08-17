#!/usr/bin/env node
/**
 * Popula a instância Appwrite com os dados reais do handoff de design
 * (scripts/data/relgov-data.json — 22 pautas, 12 pendências) e cria
 * 3 usuários de teste para validar o RBAC (Administrador, Coordenador
 * RelGov, Leitor).
 *
 * Rodar depois de scripts/setup-appwrite.mjs:
 *   node --env-file=.env.local scripts/seed.mjs
 *
 * Idempotente na parte de schema, mas cria linhas NOVAS a cada execução
 * (não faz upsert por título) — rode uma vez por ambiente/instância limpa.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { Client, TablesDB, Users, ID } from "node-appwrite";

const __dirname = dirname(fileURLToPath(import.meta.url));

const endpoint = requireEnv("NEXT_PUBLIC_APPWRITE_ENDPOINT");
const project = requireEnv("NEXT_PUBLIC_APPWRITE_PROJECT_ID");
const apiKey = requireEnv("APPWRITE_API_KEY");
const databaseId = process.env.APPWRITE_DATABASE_ID || "relgov";

const client = new Client().setEndpoint(endpoint).setProject(project).setKey(apiKey);
const tablesDB = new TablesDB(client);
const users = new Users(client);

const data = JSON.parse(
  readFileSync(join(__dirname, "data", "relgov-data.json"), "utf-8")
);

// Pendências cujo campo "pauta" (texto livre no dado de origem) corresponde
// claramente a uma das 22 pautas legislativas — o resto é acompanhamento
// institucional sem pauta específica (ver README, seção de modelagem).
const PAUTA_MATCH = {
  "Agenda com Bibo Nunes — PLP 102/2025": "PLP 102/2025 — MEI para Eventos",
  "PLP 152/2025 — relatoria e agenda": "PLP 152/2025 — Trabalho por Plataformas Digitais",
  "Nota Técnica MEMP — PLP 152/2025": "PLP 152/2025 — Trabalho por Plataformas Digitais",
  "PERSE — dados Receita/DIRBI": "PERSE — reposicionamento pós-teto fiscal",
  "Reforma Tributária — orientação aos associados":
    "Reforma Tributária — PLP 68/2024 / LC 214/2025",
  "Portaria MTE nº 3.665/2023": "Portaria MTE nº 3.665/2023 — Trabalho em Feriados",
  "Base oficial de dados setoriais": "Estudo Setorial sobre Informalidade e Dados do Setor",
};

const TEST_USERS = [
  { name: "Ana Administradora", email: "admin@relgov.local", role: "administrador" },
  { name: "Carlos Coordenador", email: "coordenador@relgov.local", role: "coordenador_relgov" },
  { name: "Lia Leitora", email: "leitor@relgov.local", role: "leitor" },
];
const SENHA_TESTE = "RelGov#2026";

async function main() {
  console.log(`Seeding ${data.projetos.length} pautas e ${data.pendencias.length} pendências…\n`);

  const idPorTitulo = new Map();

  for (const projeto of data.projetos) {
    const pautaId = ID.unique();
    await tablesDB.createRow({
      databaseId,
      tableId: "pautas",
      rowId: pautaId,
      data: {
        titulo: projeto.titulo,
        eixo: projeto.eixo,
        atuacao: projeto.atuacao,
        contexto: projeto.contexto,
        situacaoAtual: projeto.situacao_atual,
        interlocutores: projeto.interlocutores,
        prioridade: normalizaPrioridade(projeto.prioridade),
        fonteReferencia: projeto.fonte_referencia,
        status: projeto.status,
        linkOficial: null,
        ativo: projeto.ativo ?? true,
      },
    });
    idPorTitulo.set(projeto.titulo, pautaId);

    const itens = (projeto.proximos_encaminhamentos ?? "")
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean);
    for (const [ordem, texto] of itens.entries()) {
      await tablesDB.createRow({
        databaseId,
        tableId: "encaminhamentos",
        rowId: ID.unique(),
        data: { pautaId, texto, ordem, concluido: false, concluidoEm: null, concluidoPorNome: null },
      });
    }

    await tablesDB.createRow({
      databaseId,
      tableId: "movimentacoes",
      rowId: ID.unique(),
      data: {
        pautaId,
        data: new Date().toISOString(),
        origem: "REGISTRO_MANUAL",
        titulo: "Cadastro inicial",
        descricao: "Pauta importada do relatório RELGOV na carga inicial de dados.",
        criadoPorNome: "Seed",
      },
    });

    console.log(`✓ pauta: ${projeto.titulo}`);
  }

  for (const pendencia of data.pendencias) {
    const tituloVinculado = PAUTA_MATCH[pendencia.pauta];
    const pautaId = tituloVinculado ? (idPorTitulo.get(tituloVinculado) ?? null) : null;

    await tablesDB.createRow({
      databaseId,
      tableId: "pendencias",
      rowId: ID.unique(),
      data: {
        pautaId,
        descricao: pendencia.descricao,
        responsavel: pendencia.responsavel,
        ultimaMovimentacao: pendencia.ultima_movimentacao,
        status: pendencia.status,
        prioridade: normalizaPrioridade(pendencia.prioridade),
        proximaCobranca: pendencia.proxima_cobranca,
        prazoSugerido: pendencia.prazo_sugerido,
        evidencia: pendencia.evidencia ?? "",
        observacoes: pendencia.observacoes ?? "",
      },
    });
    console.log(`✓ pendência: ${pendencia.pauta}${pautaId ? "" : " (institucional, sem pauta)"}`);
  }

  console.log("\nCriando usuários de teste…");
  for (const u of TEST_USERS) {
    try {
      const created = await users.create({
        userId: ID.unique(),
        email: u.email,
        password: SENHA_TESTE,
        name: u.name,
      });
      await users.updateLabels({ userId: created.$id, labels: [u.role] });
      await users.updatePrefs({
        userId: created.$id,
        prefs: { receberAlertas: true, ultimaAbaPainel: "resumo" },
      });
      console.log(`✓ usuário: ${u.email} (${u.role})`);
    } catch (err) {
      if (err?.code === 409) {
        console.log(`· usuário ${u.email} já existe`);
      } else {
        throw err;
      }
    }
  }

  console.log(`\nPronto. Login de teste (senha "${SENHA_TESTE}"):`);
  for (const u of TEST_USERS) console.log(`  ${u.email} — ${u.role}`);
}

function normalizaPrioridade(valor) {
  const v = (valor ?? "").toLowerCase();
  if (v.startsWith("méd") || v.startsWith("med")) return "Media";
  if (v.startsWith("bai")) return "Baixa";
  return "Alta";
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
