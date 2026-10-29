#!/usr/bin/env node
/**
 * run.mjs — CLI do sync RelGov ↔ Câmara dos Deputados.
 *
 * Uso (Node 20+; carrega .env.local automaticamente):
 *   node scripts/camara/run.mjs                      # provisiona + sincroniza tudo (últimos 12 meses)
 *   node scripts/camara/run.mjs --provisionar        # só cria/atualiza as coleções
 *   node scripts/camara/run.mjs --sincronizar        # pula provisionamento
 *   node scripts/camara/run.mjs --only=proposicoes   # só um passo (lista separada por vírgula)
 *   node scripts/camara/run.mjs --tipos=PL,PEC --desde=2025-01-01 --ate=2026-09-06
 *   node scripts/camara/run.mjs --leg=57
 *   node scripts/camara/run.mjs --sem=frentes,orgaos-dep,tramitacoes,detalhe-dep
 *
 * Passos válidos em --only:
 *   situacoes | orgaos | partidos | lideres-partido | lideres-legislatura | deputados | proposicoes
 */

import fs from 'node:fs';
import path from 'node:path';
import { makeDatabases, getConfig, ensureCollection } from './appwrite.mjs';
import { COLLECTIONS } from './schema.mjs';
import { collectAll } from './camara.mjs';
import * as S from './sync.mjs';

// --- .env loader (sem dependências) ---------------------------------------
function loadEnvFile(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}
function loadEnv() {
  const cwd = process.cwd();
  for (const f of ['.env.local', '.env']) loadEnvFile(path.join(cwd, f));
}

// --- args -----------------------------------------------------------------
function parseArgs(argv) {
  const o = {};
  for (const a of argv) {
    if (!a.startsWith('--')) continue;
    const [k, v] = a.slice(2).split('=');
    o[k] = v === undefined ? true : v;
  }
  return o;
}

const isoDate = (d) => d.toISOString().slice(0, 10);
function defaultRange() {
  const ate = new Date();
  const desde = new Date();
  desde.setFullYear(desde.getFullYear() - 1);
  return { desde: isoDate(desde), ate: isoDate(ate) };
}

async function main() {
  loadEnv();
  const args = parseArgs(process.argv.slice(2));
  const { databaseId } = getConfig();

  const provisionar = !args.sincronizar; // por padrão provisiona, a menos que --sincronizar
  const sincronizar = !args.provisionar; // por padrão sincroniza, a menos que --provisionar

  const only = args.only ? String(args.only).split(',').map((x) => x.trim()).filter(Boolean) : null;
  const sem = new Set(args.sem ? String(args.sem).split(',').map((x) => x.trim()) : []);
  const range = defaultRange();
  const desde = args.desde || range.desde;
  const ate = args.ate || range.ate;
  const tipos = args.tipos ? String(args.tipos).split(',').map((x) => x.trim().toUpperCase()) : undefined;
  const itemDelayMs = args.delay ? Number(args.delay) : 120;

  const db = makeDatabases();
  const log = (...m) => console.log(...m);
  log(`RelGov ↔ Câmara — banco '${databaseId}'`);

  // 1) Provisionamento
  if (provisionar) {
    log('\n== Provisionando coleções ==');
    for (const col of COLLECTIONS) {
      log(`- ${col.id}`);
      await ensureCollection(db, databaseId, col, log);
    }
    if (!sincronizar) { log('\nProvisionamento concluído.'); return; }
  }

  if (!sincronizar) return;

  // 2) Sincronização
  const ctx = { db, dbId: databaseId, log, itemDelayMs, stats: {} };
  const legId = args.leg ? Number(args.leg) : (await S.getLegislaturaAtual());
  if (!legId) throw new Error('Não foi possível determinar a legislatura (use --leg=57).');

  const runAll = !only;
  const want = (step) => runAll || only.includes(step);
  let partidoIds = null;

  log(`\n== Sincronizando (legislatura ${legId}) ==`);

  if (want('situacoes')) await S.syncSituacoesProposicao(ctx);
  if (want('orgaos')) await S.syncOrgaos(ctx);
  if (want('partidos')) partidoIds = await S.syncPartidos(ctx);

  if (want('lideres-partido')) {
    if (!partidoIds) partidoIds = (await collectAll('/partidos')).map((p) => p.id);
    await S.syncPartidoLideres(ctx, partidoIds);
  }
  if (want('lideres-legislatura')) await S.syncLegislaturaLideres(ctx, legId);

  if (want('deputados')) {
    await S.syncDeputados(ctx, legId, {
      withDetalhe: !sem.has('detalhe-dep'),
      withFrentes: !sem.has('frentes'),
      withOrgaos: !sem.has('orgaos-dep'),
    });
  }

  if (want('proposicoes')) {
    await S.syncProposicoes(ctx, {
      tipos,
      dataInicio: desde,
      dataFim: ate,
      withDetalhe: !sem.has('detalhe-prop'),
      withTramitacoes: !sem.has('tramitacoes'),
    });
  }

  // 3) Resumo
  log('\n== Resumo ==');
  let totalC = 0; let totalU = 0;
  for (const [col, st] of Object.entries(ctx.stats)) {
    log(`  ${col.padEnd(28)} criados: ${String(st.created).padStart(5)}  atualizados: ${String(st.updated).padStart(5)}`);
    totalC += st.created; totalU += st.updated;
  }
  log(`  ${'TOTAL'.padEnd(28)} criados: ${String(totalC).padStart(5)}  atualizados: ${String(totalU).padStart(5)}`);
  log('\nConcluído.');
}

main().catch((err) => {
  console.error('\n[ERRO]', err.message);
  process.exitCode = 1;
});
