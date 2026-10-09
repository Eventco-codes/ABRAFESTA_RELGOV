// src/lib/senado/client.ts
// Cliente HTTP da API de Dados Abertos do Senado (seção Processo). SÓ SERVIDOR.
// Respostas são arrays JSON diretos (sem envelope). Retry por instabilidade,
// negociação de conteúdo (JSON por padrão; NDJSON disponível para grandes volumes).

import type {
  Processo,
  Relatoria,
  Documento,
  Emenda,
  Prazo,
  DominioItem,
  ProcessoFiltro,
} from "./types";

const BASE_URL =
  process.env.SENADO_BASE_URL ?? "https://legis.senado.leg.br/dadosabertos";

export class SenadoError extends Error {
  constructor(
    message: string,
    readonly httpStatus?: number,
    readonly endpoint?: string,
  ) {
    super(message);
    this.name = "SenadoError";
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface FetchOpts {
  retries?: number;
  baseDelayMs?: number;
  timeoutMs?: number;
}

async function fetchWithRetry(
  url: string,
  { retries = 3, baseDelayMs = 800, timeoutMs = 90_000 }: FetchOpts = {},
): Promise<Response> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: ac.signal,
      });
      clearTimeout(t);
      if ([429, 500, 502, 503, 504].includes(res.status) && attempt < retries) {
        await sleep(baseDelayMs * 2 ** attempt);
        continue;
      }
      return res;
    } catch (err) {
      clearTimeout(t);
      lastErr = err;
      if (attempt < retries) {
        await sleep(baseDelayMs * 2 ** attempt);
        continue;
      }
    }
  }
  throw new SenadoError(`Falha de rede após retries: ${String(lastErr)}`, undefined, url);
}

function buildUrl(
  path: string,
  query?: Record<string, string | number | string[] | undefined>,
): string {
  const url = new URL(BASE_URL + path);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null || v === "") continue;
      if (Array.isArray(v)) v.forEach((x) => url.searchParams.append(k, String(x)));
      else url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

/** GET que retorna um array JSON. Normaliza objeto único para [obj]. */
async function getArray<T>(
  path: string,
  query?: Record<string, string | number | string[] | undefined>,
  opts?: FetchOpts,
): Promise<T[]> {
  const url = buildUrl(path, query);
  const res = await fetchWithRetry(url, opts);
  const text = await res.text();
  if (!res.ok) {
    throw new SenadoError(`HTTP ${res.status}: ${text.slice(0, 160)}`, res.status, path);
  }
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new SenadoError(`Resposta não-JSON: ${text.slice(0, 120)}`, res.status, path);
  }
  if (Array.isArray(json)) return json as T[];
  if (json && typeof json === "object") return [json as T];
  return [];
}

async function getOne<T>(path: string, query?: Record<string, string | number | undefined>, opts?: FetchOpts): Promise<T | null> {
  const arr = await getArray<T>(path, query, opts);
  return arr[0] ?? null;
}

export const senado = {
  // ---------- Processos ----------
  /** Lista processos legislativos com filtros (ver ProcessoFiltro). */
  processos: (filtro: ProcessoFiltro = {}) =>
    getArray<Processo>("/processo", filtro as Record<string, string | number | string[] | undefined>),
  processo: (id: number, v?: number) =>
    getOne<Processo>(`/processo/${id}`, { v }),

  // ---------- Relacionados (por filtro) ----------
  relatorias: (filtro: { idProcesso?: number; codigoMateria?: number; sigla?: string; ano?: number; tramitando?: "S" | "N"; codigoParlamentar?: number; dataInicio?: string; dataFim?: string; v?: number } = {}) =>
    getArray<Relatoria>("/processo/relatoria", filtro),
  documentos: (filtro: { idProcesso?: number; codigoMateria?: number; sigla?: string; siglaTipo?: string; dataInicio?: string; dataFim?: string; v?: number } = {}) =>
    getArray<Documento>("/processo/documento", filtro),
  emendas: (filtro: { idProcesso?: number; codigoMateria?: number; dataInicio?: string; dataFim?: string; v?: number } = {}) =>
    getArray<Emenda>("/processo/emenda", filtro),
  prazos: (filtro: { idProcesso?: number; codigoMateria?: number; sigla?: string; dataInicio?: string; dataFim?: string; v?: number } = {}) =>
    getArray<Prazo>("/processo/prazo", filtro),

  // ---------- Tabelas de domínio ----------
  tiposSituacao: () => getArray<DominioItem>("/processo/tipos-situacao"),
  tiposDecisao: () => getArray<DominioItem>("/processo/tipos-decisao"),
  tiposAutor: () => getArray<DominioItem>("/processo/tipos-autor"),
  tiposAtualizacao: () => getArray<DominioItem>("/processo/tipos-atualizacao"),
  tiposDocumento: () => getArray<DominioItem>("/processo/documento/tipos"),
  tiposConteudo: () => getArray<DominioItem>("/processo/documento/tipos-conteudo"),
  tiposPrazo: () => getArray<DominioItem>("/processo/prazo/tipos"),
  classes: () => getArray<DominioItem>("/processo/classes"),
  destinos: () => getArray<DominioItem>("/processo/destinos"),
  assuntos: () => getArray<DominioItem>("/processo/assuntos"),
  entes: () => getArray<DominioItem>("/processo/entes"),
  siglas: () => getArray<DominioItem>("/processo/siglas"),
};

export { BASE_URL as SENADO_BASE_URL };
