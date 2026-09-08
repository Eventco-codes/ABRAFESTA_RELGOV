/**
 * Appwrite Function — RelGov · Sync Câmara
 * Entrypoint agendado (e acionável via HTTP).
 *
 * Modos:
 *   auto (padrão nos agendamentos): decide pelo dia da semana.
 *       - dia == RELGOV_FULL_DOW  → 'full'   (varredura completa)
 *       - demais dias             → 'incremental' (proposições/tramitações recentes)
 *   full        : provisiona + sincroniza tudo (janela RELGOV_FULL_MONTHS)
 *   incremental : só proposições + tramitações dos últimos RELGOV_INCREMENT_DAYS dias
 *   provision   : só cria/atualiza as coleções e sai
 *
 * Acionar manualmente:  corpo JSON { "mode": "full" }  ou  ?mode=full
 *
 * Chave de acesso ao banco:
 *   - Appwrite 1.5+: use "scopes" na função (databases.read/write); a chave
 *     dinâmica chega no header x-appwrite-key e é usada automaticamente.
 *   - Versões antigas: defina a variável APPWRITE_API_KEY na função.
 */

import { makeDatabases, getConfig, ensureCollection } from './lib/appwrite.mjs';
import { COLLECTIONS } from './lib/schema.mjs';
import * as S from './lib/sync.mjs';

const iso = (d) => d.toISOString().slice(0, 10);
const num = (v, def) => (v == null || v === '' || Number.isNaN(Number(v)) ? def : Number(v));

function resolveMode(req) {
  let body = {};
  try { body = req?.bodyJson ?? (req?.bodyRaw ? JSON.parse(req.bodyRaw) : {}); } catch { /* corpo vazio/agendado */ }
  const q = req?.query || {};
  let mode = body.mode || q.mode || 'auto';
  if (mode === 'auto') {
    const fullDow = num(process.env.RELGOV_FULL_DOW, 0); // 0 = domingo (UTC)
    mode = new Date().getUTCDay() === fullDow ? 'full' : 'incremental';
  }
  return mode;
}

export default async ({ req, res, log, error }) => {
  const started = Date.now();
  try {
    const mode = resolveMode(req);
    const { databaseId } = getConfig();
    // Prefere a chave dinâmica da Function; cai para APPWRITE_API_KEY se não houver.
    const db = makeDatabases({ apiKey: req?.headers?.['x-appwrite-key'] });

    const ctx = {
      db,
      dbId: databaseId,
      log,
      itemDelayMs: num(process.env.RELGOV_ITEM_DELAY_MS, 120),
      stats: {},
    };
    const tipos = (process.env.RELGOV_TIPOS || 'PL,PLP,PEC,MPV,PDL')
      .split(',').map((x) => x.trim().toUpperCase()).filter(Boolean);

    log(`RelGov · Sync Câmara — modo='${mode}', banco='${databaseId}'`);

    // Provisionamento (idempotente) em full e provision.
    if (mode === 'full' || mode === 'provision') {
      for (const col of COLLECTIONS) await ensureCollection(db, databaseId, col, log);
      if (mode === 'provision') {
        return res.json({ ok: true, mode, ms: Date.now() - started });
      }
    }

    const now = new Date();
    const ate = iso(now);

    if (mode === 'incremental') {
      const days = num(process.env.RELGOV_INCREMENT_DAYS, 30);
      const desde = iso(new Date(now.getTime() - days * 86400000));
      await S.syncProposicoes(ctx, {
        tipos, dataInicio: desde, dataFim: ate, withDetalhe: true, withTramitacoes: true,
      });
    } else if (mode === 'full') {
      const legId = await S.getLegislaturaAtual();
      if (!legId) throw new Error('Não foi possível determinar a legislatura atual.');
      const months = num(process.env.RELGOV_FULL_MONTHS, 12);
      const desde = iso(new Date(now.getFullYear(), now.getMonth() - months, now.getDate()));

      await S.syncSituacoesProposicao(ctx);
      await S.syncOrgaos(ctx);
      const partidoIds = await S.syncPartidos(ctx);
      await S.syncPartidoLideres(ctx, partidoIds);
      await S.syncLegislaturaLideres(ctx, legId);
      await S.syncDeputados(ctx, legId, { withDetalhe: true, withFrentes: true, withOrgaos: true });
      await S.syncProposicoes(ctx, {
        tipos, dataInicio: desde, dataFim: ate, withDetalhe: true, withTramitacoes: true,
      });
    } else {
      throw new Error(`Modo inválido: ${mode} (use auto|full|incremental|provision).`);
    }

    const ms = Date.now() - started;
    log(`Concluído em ${(ms / 1000).toFixed(1)}s — ${JSON.stringify(ctx.stats)}`);
    return res.json({ ok: true, mode, ms, stats: ctx.stats });
  } catch (e) {
    error(`Falha: ${e.message}`);
    return res.json({ ok: false, error: e.message, ms: Date.now() - started }, 500);
  }
};
