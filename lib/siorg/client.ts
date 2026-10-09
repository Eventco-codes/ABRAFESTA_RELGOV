// src/lib/siorg/client.ts
// Cliente HTTP da API SIORG. SÓ SERVIDOR (a API pode exigir certificados SERPRO
// e não deve ser chamada do browser). Trata o envelope `servico`, faz retry por
// causa dos 502 intermitentes do upstream e extrai IDs das URIs de linked-data.

import type {
  SiorgEnvelope,
  SiorgServico,
  Poder,
  Esfera,
  NaturezaJuridica,
  SubNaturezaJuridica,
  TipoUnidade,
  CategoriaUnidade,
  UnidadeOrganizacional,
  EstruturaNo,
  AlteracoesResposta,
  TipoCargoFuncao,
  IntegranteColegiado,
  AtoNormativo,
  UnidadeInstancias,
  EnderecoContatoResposta,
} from "./types";

const BASE_URL =
  process.env.SIORG_BASE_URL ??
  "https://estruturaorganizacional.dados.gov.br/doc";

export class SiorgError extends Error {
  constructor(
    message: string,
    readonly codigoErro?: number,
    readonly httpStatus?: number,
    readonly endpoint?: string,
  ) {
    super(message);
    this.name = "SiorgError";
  }
}

/**
 * Extrai o último segmento de uma URI de código do SIORG.
 * Ex.: ".../id/poder/executivo" -> "executivo"; ".../unidade-organizacional/26" -> "26".
 * ATENÇÃO: o segmento pode ser numérico OU slug (inconsistente entre endpoints).
 */
export function extractId(uri: string | null | undefined): string | null {
  if (uri == null) return null;
  const s = String(uri).trim();
  if (s === "") return null;
  const clean = s.split(/[?#]/)[0].replace(/\/+$/, "");
  const seg = clean.substring(clean.lastIndexOf("/") + 1);
  return seg || null;
}

/** extractId + Number(), retornando null se não for numérico. */
export function extractNumericId(uri: string | null | undefined): number | null {
  const seg = extractId(uri);
  if (seg == null) return null;
  const n = Number(seg);
  return Number.isFinite(n) ? n : null;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface FetchOpts {
  retries?: number;
  baseDelayMs?: number;
  timeoutMs?: number;
}

/** GET com retry/backoff para os 502 intermitentes do upstream. */
async function fetchWithRetry(
  url: string,
  { retries = 3, baseDelayMs = 800, timeoutMs = 60_000 }: FetchOpts = {},
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
      // 502/503/504 do proxy do governo -> vale tentar de novo
      if ([502, 503, 504].includes(res.status) && attempt < retries) {
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
  throw new SiorgError(
    `Falha de rede após retries: ${String(lastErr)}`,
    undefined,
    undefined,
    url,
  );
}

function buildUrl(path: string, query?: Record<string, string | number | undefined>): string {
  const url = new URL(BASE_URL + path);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

/** GET genérico: desembrulha o envelope, valida servico.codigoErro e devolve a chave de dados. */
async function get<T>(
  path: string,
  dataKey: string,
  query?: Record<string, string | number | undefined>,
  opts?: FetchOpts,
): Promise<{ servico: SiorgServico; data: T }> {
  const url = buildUrl(path, query);
  const res = await fetchWithRetry(url, opts);

  const text = await res.text();
  let json: SiorgEnvelope<Record<string, unknown>>;
  try {
    json = JSON.parse(text);
  } catch {
    throw new SiorgError(
      `Resposta não-JSON (HTTP ${res.status}): ${text.slice(0, 120)}`,
      undefined,
      res.status,
      path,
    );
  }

  const servico = json.servico as SiorgServico | undefined;
  if (!servico) {
    throw new SiorgError(`Sem envelope 'servico' (HTTP ${res.status})`, undefined, res.status, path);
  }
  if (servico.codigoErro !== 0) {
    throw new SiorgError(
      `SIORG codigoErro=${servico.codigoErro}: ${servico.mensagem}`,
      servico.codigoErro,
      res.status,
      path,
    );
  }

  return { servico, data: (json[dataKey] as T) };
}

/** GET genérico p/ endpoints com mais de uma chave de dados no envelope (ex.: endereco-contato). */
async function getEnvelope<T>(
  path: string,
  query?: Record<string, string | number | undefined>,
  opts?: FetchOpts,
): Promise<T> {
  const url = buildUrl(path, query);
  const res = await fetchWithRetry(url, opts);

  const text = await res.text();
  let json: SiorgEnvelope<T>;
  try {
    json = JSON.parse(text);
  } catch {
    throw new SiorgError(
      `Resposta não-JSON (HTTP ${res.status}): ${text.slice(0, 120)}`,
      undefined,
      res.status,
      path,
    );
  }

  const servico = json.servico as SiorgServico | undefined;
  if (!servico) {
    throw new SiorgError(`Sem envelope 'servico' (HTTP ${res.status})`, undefined, res.status, path);
  }
  if (servico.codigoErro !== 0) {
    throw new SiorgError(
      `SIORG codigoErro=${servico.codigoErro}: ${servico.mensagem}`,
      servico.codigoErro,
      res.status,
      path,
    );
  }
  return json;
}

export interface SiorgQueryDefaults {
  codigoPoder?: string; // csv não; único por chamada
  codigoEsfera?: string;
}

export const siorg = {
  extractId,
  extractNumericId,

  // ---------- Domínios ----------
  poder: (ativo?: "SIM" | "NAO") =>
    get<Poder[]>("/poder", "poder", { ativo }),
  esfera: (ativo?: "SIM" | "NAO") =>
    get<Esfera[]>("/esfera", "esfera", { ativo }),
  naturezaJuridica: (ativo?: "SIM" | "NAO") =>
    get<NaturezaJuridica[]>("/natureza-juridica", "naturezaJuridica", { ativo }),
  subNaturezaJuridica: (codigoNaturezaJuridica?: number, ativo?: "SIM" | "NAO") =>
    get<SubNaturezaJuridica[]>("/subnatureza-juridica", "subNaturezaJuridica", {
      codigoNaturezaJuridica,
      ativo,
    }),
  tipoUnidade: () =>
    get<TipoUnidade[]>("/tipo-unidade", "tipoUnidade"),
  categoriaUnidade: (ativo?: "SIM" | "NAO") =>
    get<CategoriaUnidade[]>("/categoria-unidade", "categoriaUnidade", { ativo }),

  // ---------- Órgãos / entidades ----------
  orgaoEntidadeResumida: (codigoPoder = 1, codigoEsfera = 1) =>
    get<UnidadeOrganizacional[]>("/orgao-entidade/resumida", "unidades", {
      codigoPoder,
      codigoEsfera,
    }),
  orgaoEntidadeCompleta: (codigoPoder = 1, codigoEsfera = 1) =>
    get<UnidadeOrganizacional[]>("/orgao-entidade/completa", "unidades", {
      codigoPoder,
      codigoEsfera,
    }),

  // ---------- Unidade organizacional ----------
  unidade: (codigoUnidade: number | string, versaoConsulta?: string) =>
    get<UnidadeOrganizacional>(`/unidade-organizacional/${codigoUnidade}`, "unidade", {
      versaoConsulta,
    }),
  unidadeCompleta: (codigoUnidade: number | string, versaoConsulta?: string) =>
    get<UnidadeOrganizacional>(`/unidade-organizacional/${codigoUnidade}/completa`, "unidade", {
      versaoConsulta,
    }),
  estruturaUnidade: (codigoUnidade: number | string, versaoConsulta?: string) =>
    get<EstruturaNo>(`/unidade-organizacional/${codigoUnidade}/estrutura`, "estrutura", {
      versaoConsulta,
    }),
  estruturaFilha: (codigoUnidade: number | string, retornarVinculados?: "SIM" | "NAO") =>
    get<UnidadeOrganizacional[]>(
      `/estrutura-organizacional/${codigoUnidade}/filha`,
      "unidades",
      { retornarOrgaoEntidadeVinculados: retornarVinculados },
    ),

  /** Cargos e ocupantes de uma unidade — usado para achar Ministro de Estado /
   * Chefe de Gabinete. `nomeTitular` vem consistentemente null nesta API. */
  instanciasUnidade: (codigoUnidade: number | string) =>
    get<UnidadeInstancias>("/instancias/consulta-unidade", "unidade", { codigoUnidade }),

  /** Endereço e contato (telefone/e-mail/site) de uma unidade — confirmado com
   * dados reais em produção (ex.: MTur). Envelope com 2 chaves, ver getEnvelope. */
  enderecoContato: (codigoUnidade: number | string) =>
    getEnvelope<EnderecoContatoResposta>(
      `/unidade-organizacional/${codigoUnidade}/endereco-contato`,
    ),

  // ---------- Delta ----------
  alteracoes: (versaoReferencia: string | number) =>
    get<AlteracoesResposta>("/estrutura-organizacional/alteracoes", "resposta", {
      versaoReferencia,
    }),

  // ---------- Cargos / funções ----------
  cargoFuncao: () =>
    get<TipoCargoFuncao[]>("/cargo-funcao", "tipoCargoFuncao"),

  // ---------- Colegiado ----------
  colegiado: (codigoUnidade: number | string) =>
    get<IntegranteColegiado[]>(
      `/composicao-colegiado/${codigoUnidade}`,
      "integranteColegiadoResumido",
    ),
};

export type { AtoNormativo };
