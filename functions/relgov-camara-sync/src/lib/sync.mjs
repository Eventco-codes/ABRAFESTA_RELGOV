/**
 * sync.mjs — Orquestrador. Uma função por passo; cada uma grava via upsert.
 *
 * Um "ctx" carrega db, dbId, logger, contadores e opções. Todos os passos são
 * idempotentes: rerodar atualiza os documentos existentes.
 */

import { apiGet, paginate, getOne, sleep } from './camara.mjs';
import { upsert } from './appwrite.mjs';
import * as M from './mappers.mjs';

function makeCounter(ctx, colId) {
  return async (mapped) => {
    if (!mapped?.id) return;
    const { created } = await upsert(ctx.db, ctx.dbId, colId, mapped.id, mapped.data);
    ctx.stats[colId] = ctx.stats[colId] || { created: 0, updated: 0 };
    ctx.stats[colId][created ? 'created' : 'updated']++;
  };
}

// --- Referências ----------------------------------------------------------

export async function syncSituacoesProposicao(ctx) {
  ctx.log('• Referência: situações de proposição');
  const write = makeCounter(ctx, 'ref_situacoes_proposicao');
  const json = await apiGet('/referencias/situacoesProposicao');
  for (const r of json?.dados ?? []) await write(M.mapSituacaoProposicao(r));
}

// --- Órgãos ---------------------------------------------------------------

export async function syncOrgaos(ctx) {
  ctx.log('• Órgãos');
  const write = makeCounter(ctx, 'orgaos');
  for await (const o of paginate('/orgaos')) await write(M.mapOrgao(o));
}

// --- Partidos + líderes ---------------------------------------------------

export async function syncPartidos(ctx) {
  ctx.log('• Partidos');
  const write = makeCounter(ctx, 'partidos');
  const ids = [];
  for await (const p of paginate('/partidos')) {
    ids.push(p.id);
    await write(M.mapPartido(p));
  }
  return ids;
}

export async function syncPartidoLideres(ctx, partidoIds) {
  ctx.log(`• Líderes por partido (${partidoIds.length} partidos)`);
  const write = makeCounter(ctx, 'partido_lideres');
  for (const pid of partidoIds) {
    const json = await apiGet(`/partidos/${pid}/lideres`);
    for (const l of json?.dados ?? []) await write(M.mapPartidoLider(pid, l));
    await sleep(ctx.itemDelayMs);
  }
}

export async function syncLegislaturaLideres(ctx, legId) {
  ctx.log(`• Líderes da legislatura ${legId}`);
  const write = makeCounter(ctx, 'legislatura_lideres');
  for await (const l of paginate(`/legislaturas/${legId}/lideres`)) {
    await write(M.mapLegislaturaLider(legId, l));
  }
}

// --- Deputados (+ detalhe, frentes, órgãos) -------------------------------

export async function syncDeputados(ctx, legId, opts = {}) {
  const { withDetalhe = true, withFrentes = true, withOrgaos = true } = opts;
  ctx.log(`• Deputados da legislatura ${legId} (detalhe=${withDetalhe} frentes=${withFrentes} orgaos=${withOrgaos})`);
  const writeDep = makeCounter(ctx, 'deputados');
  const writeFr = makeCounter(ctx, 'deputado_frentes');
  const writeOrg = makeCounter(ctx, 'deputado_orgaos');

  // Primeiro coleta os ids da listagem (rápido), depois enriquece um a um.
  const deputados = [];
  for await (const d of paginate('/deputados', { idLegislatura: legId, ordenarPor: 'nome', ordem: 'ASC' })) {
    deputados.push(d);
    await writeDep(M.mapDeputadoLista(d));
  }
  ctx.log(`  ${deputados.length} deputados na listagem`);

  if (!withDetalhe && !withFrentes && !withOrgaos) return;

  let n = 0;
  for (const d of deputados) {
    if (withDetalhe) {
      const det = await getOne(`/deputados/${d.id}`);
      if (det) await writeDep(M.mapDeputadoDetalhe(det));
    }
    if (withFrentes) {
      const fr = await apiGet(`/deputados/${d.id}/frentes`);
      for (const f of fr?.dados ?? []) await writeFr(M.mapDeputadoFrente(d.id, f));
    }
    if (withOrgaos) {
      const org = await apiGet(`/deputados/${d.id}/orgaos`);
      for (const o of org?.dados ?? []) await writeOrg(M.mapDeputadoOrgao(d.id, o));
    }
    n++;
    if (n % 50 === 0) ctx.log(`  ...${n}/${deputados.length}`);
    await sleep(ctx.itemDelayMs);
  }
}

// --- Proposições (por tipo e período) + tramitações -----------------------

export async function syncProposicoes(ctx, opts = {}) {
  const {
    tipos = ['PL', 'PLP', 'PEC', 'MPV', 'PDL'],
    dataInicio,               // 'YYYY-MM-DD'
    dataFim,                  // 'YYYY-MM-DD'
    withDetalhe = true,       // necessário para status (situação atual)
    withTramitacoes = true,
  } = opts;

  ctx.log(`• Proposições [${tipos.join(', ')}] ${dataInicio} → ${dataFim} (detalhe=${withDetalhe} tramitacoes=${withTramitacoes})`);
  const writeProp = makeCounter(ctx, 'proposicoes');
  const writeTram = makeCounter(ctx, 'tramitacoes');

  for (const tipo of tipos) {
    const ids = [];
    for await (const p of paginate('/proposicoes', {
      siglaTipo: tipo,
      dataApresentacaoInicio: dataInicio,
      dataApresentacaoFim: dataFim,
      ordenarPor: 'id',
      ordem: 'ASC',
    })) {
      ids.push(p.id);
      await writeProp(M.mapProposicaoLista(p)); // grava o básico já
    }
    ctx.log(`  ${tipo}: ${ids.length} proposições`);

    for (const id of ids) {
      try {
        if (withDetalhe) {
          const det = await getOne(`/proposicoes/${id}`);
          if (det) await writeProp(M.mapProposicaoDetalhe(det));
        }
        if (withTramitacoes) {
          // Ao contrário de /proposicoes, este endpoint não pagina — devolve a
          // lista inteira de uma vez e rejeita (400) os parâmetros itens/pagina.
          const tram = await apiGet(`/proposicoes/${id}/tramitacoes`);
          for (const t of tram?.dados ?? []) {
            await writeTram(M.mapTramitacao(id, t));
          }
        }
      } catch (err) {
        ctx.log(`  [erro] proposição ${id}: ${err.message}`);
      }
      await sleep(ctx.itemDelayMs);
    }
  }
}

// --- Descoberta da legislatura atual --------------------------------------

export async function getLegislaturaAtual() {
  const json = await apiGet('/legislaturas', { ordem: 'DESC', ordenarPor: 'id', itens: 1 });
  return json?.dados?.[0]?.id ?? null;
}
