/**
 * camara.mjs — Cliente da API "Dados Abertos da Câmara dos Deputados" (v2).
 *
 * - fetch nativo (Node 18+); nenhuma dependência externa.
 * - Retry com backoff exponencial em 429 e 5xx.
 * - Paginação seguindo os links rel="next" retornados pela própria API.
 *
 * Padrão da API: listagens retornam 15 itens; limite 100 por requisição.
 * Docs: https://dadosabertos.camara.leg.br/swagger/api.html
 */

export const BASE_URL = 'https://dadosabertos.camara.leg.br/api/v2';
const HEADERS = { Accept: 'application/json' };

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function buildUrl(path, params = {}) {
  const url = new URL(BASE_URL + path);
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue;
    if (Array.isArray(v)) v.forEach((item) => url.searchParams.append(k, item));
    else url.searchParams.set(k, String(v));
  }
  return url;
}

/**
 * GET com retry. Retorna o JSON completo (inclui `dados` e `links`).
 */
export async function apiGet(path, params = {}, { retries = 4, timeoutMs = 30000 } = {}) {
  const url = buildUrl(path, params);
  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    let res;
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), timeoutMs);
      res = await fetch(url, { headers: HEADERS, signal: ctrl.signal });
      clearTimeout(t);
    } catch (err) {
      if (attempt < retries) {
        await sleep(Math.min(2000 * 2 ** attempt, 15000));
        attempt++;
        continue;
      }
      throw new Error(`Falha de rede em ${url.pathname}${url.search}: ${err.message}`);
    }

    if (res.ok) return res.json();

    // 404 é significativo (ex.: proposição sem tramitações) — devolve vazio.
    if (res.status === 404) return { dados: [], links: [] };

    if ((res.status === 429 || res.status >= 500) && attempt < retries) {
      const retryAfter = Number(res.headers.get('retry-after'));
      const wait = Number.isFinite(retryAfter) && retryAfter > 0
        ? retryAfter * 1000
        : Math.min(2000 * 2 ** attempt, 15000);
      await sleep(wait);
      attempt++;
      continue;
    }

    const body = await res.text().catch(() => '');
    throw new Error(`Câmara API ${res.status} em ${url.pathname}${url.search}: ${body.slice(0, 300)}`);
  }
}

/**
 * Itera todos os itens de uma listagem, página a página (rel="next").
 * `pageDelayMs` dá um respiro entre páginas para não sobrecarregar a API.
 */
export async function* paginate(path, params = {}, opts = {}) {
  const { itens = 100, pageDelayMs = 150, maxPages = Infinity } = opts;
  let page = 1;
  while (page <= maxPages) {
    const json = await apiGet(path, { ...params, itens, pagina: page });
    const dados = Array.isArray(json?.dados) ? json.dados : [];
    for (const item of dados) yield item;

    const hasNext = (json?.links ?? []).some((l) => l.rel === 'next');
    if (!hasNext || dados.length === 0) break;
    page++;
    if (pageDelayMs) await sleep(pageDelayMs);
  }
}

/** Coleta uma listagem inteira em um array. Use com cautela em endpoints grandes. */
export async function collectAll(path, params = {}, opts = {}) {
  const out = [];
  for await (const item of paginate(path, params, opts)) out.push(item);
  return out;
}

/** Atalho para endpoints de recurso único (/deputados/{id}, /proposicoes/{id}). */
export async function getOne(path, params = {}) {
  const json = await apiGet(path, params);
  return json?.dados ?? null;
}
