// lib/senado/sync.ts
// Sync Senado -> Appwrite (database `relgov`). SÓ SERVIDOR.
//
// Dois focos, independentes:
// 1) Processo (o módulo entregue): monitoramento de tramitação — processos
//    em tramitação de siglas/temas de interesse, com relatorias e prazos.
//    Full: por sigla × ano (tramitando=S). Delta: /processo?numdias=N.
// 2) Senadores (adição — o módulo de Processo NÃO lista os senadores em
//    exercício nem seus dados de contato; a relatoria só traz o relator de
//    cada processo, sem e-mail/telefone). Usa /senador/lista/atual, o
//    endpoint público de cadastro de parlamentares do mesmo host do Senado.
//
// Adaptado para a API `TablesDB` do node-appwrite (v17+) — o módulo original
// usava a API clássica `Databases`, incompatível com o SDK instalado aqui.

import { Client, TablesDB, Query, ID } from "node-appwrite";
import { senado, SENADO_BASE_URL } from "./client";
import type { Processo, Relatoria, Prazo, DominioItem } from "./types";

const DB = process.env.APPWRITE_DATABASE_ID ?? "relgov";

// Siglas de tipos de processo monitorados (config por ambiente).
const SIGLAS = (process.env.SENADO_SIGLAS ?? "PL,PLP,PEC,MPV,PDL")
  .split(",").map((s) => s.trim()).filter(Boolean);
// Anos a cobrir na carga completa.
const ANOS = (process.env.SENADO_ANOS ?? String(new Date().getFullYear()))
  .split(",").map((s) => Number(s.trim())).filter((n) => Number.isFinite(n));
// Termos temáticos opcionais (filtro `termo`), ex.: "evento,turismo,cultura".
const TERMOS = (process.env.SENADO_TERMOS ?? "")
  .split(",").map((s) => s.trim()).filter(Boolean);

function adminDb(): TablesDB {
  const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
    .setKey(process.env.APPWRITE_API_KEY!);
  return new TablesDB(client);
}

const isSim = (v?: string) => !!v && /^s/i.test(v.trim());

/** Normaliza data do Senado (vários formatos) para ISO datetime ou null. */
function toIso(s?: string | null): string | null {
  if (!s) return null;
  const t = s.trim().replace(" ", "T");
  const d = new Date(t);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** ID de linha do Appwrite: máx. 36 chars, [a-zA-Z0-9._-], não começa com "_" (mesma regra de lib/siorg/sync.ts). */
function safeDocId(raw: string): string {
  let s = String(raw).replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 36);
  if (s.startsWith("_")) s = "id" + s.slice(1);
  return s || ID.unique();
}

async function upsert(db: TablesDB, tableId: string, rawRowId: string, data: Record<string, unknown>) {
  const rowId = safeDocId(rawRowId);
  try {
    await db.updateRow({ databaseId: DB, tableId, rowId, data });
  } catch (err) {
    if ((err as { code?: number })?.code === 404) {
      await db.createRow({ databaseId: DB, tableId, rowId, data });
    } else {
      throw err;
    }
  }
}

export interface EtapaResultado {
  recurso: string;
  registros: number;
  status: "ok" | "erro";
  erro?: string;
}

async function registrarMeta(db: TablesDB, recurso: string, registros: number, status: "ok" | "erro") {
  await upsert(db, "senado_sync_meta", recurso, {
    recurso, registros, ultimoStatus: status, ultimoSyncEm: new Date().toISOString(),
  }).catch(() => {});
}

async function etapa(db: TablesDB, recurso: string, fn: () => Promise<number>): Promise<EtapaResultado> {
  try {
    const registros = await fn();
    await registrarMeta(db, recurso, registros, "ok");
    return { recurso, registros, status: "ok" };
  } catch (err) {
    await registrarMeta(db, recurso, 0, "erro");
    return { recurso, registros: 0, status: "erro", erro: String(err) };
  }
}

// ---------- mapeamentos (Processo) ----------
function mapProcesso(p: Processo): Record<string, unknown> {
  return {
    idProcesso: p.id,
    codigoMateria: p.codigoMateria ?? null,
    identificacao: p.identificacao ?? null,
    apelido: p.apelido ?? null,
    ementa: p.ementa ?? null,
    autoria: p.autoria ?? null,
    casaIdentificadora: p.casaIdentificadora ?? null,
    tipoDocumento: p.tipoDocumento ?? null,
    situacaoAtual: p.situacaoAtual ?? null,
    tramitando: isSim(p.tramitando),
    dataApresentacao: p.dataApresentacao ?? null,
    dataSituacaoAtual: p.dataSituacaoAtual ?? null,
    normaGerada: p.normaGerada ?? null,
    urlDocumento: p.urlDocumento ?? null,
    dataUltimaAtualizacao: toIso(p.dataUltimaAtualizacao),
    sincronizadoEm: new Date().toISOString(),
  };
}

function mapRelatoria(r: Relatoria): Record<string, unknown> {
  return {
    idRelatoria: r.id,
    idProcesso: r.idProcesso ?? null,
    identificacaoProcesso: r.identificacaoProcesso ?? null,
    descricaoTipoRelator: r.descricaoTipoRelator ?? null,
    dataDesignacao: r.dataDesignacao ?? null,
    dataDestituicao: r.dataDestituicao ?? null,
    codigoParlamentar: r.codigoParlamentar ?? null,
    nomeParlamentar: r.nomeParlamentar ?? null,
    siglaPartidoParlamentar: r.siglaPartidoParlamentar ?? null,
    ufParlamentar: r.ufParlamentar ?? null,
    siglaColegiado: r.siglaColegiado ?? null,
    nomeColegiado: r.nomeColegiado ?? null,
    siglaCasa: r.siglaCasa ?? null,
    tramitando: isSim(r.tramitando),
  };
}

function mapPrazo(p: Prazo): Record<string, unknown> {
  return {
    idPrazo: p.id,
    idProcesso: p.idProcesso ?? null,
    tipoPrazo: p.tipoPrazo ?? null,
    fundamentoLegal: p.fundamentoLegal ?? null,
    siglaColegiado: p.siglaColegiado ?? null,
    descricaoTipoFase: p.descricaoTipoFase ?? null,
    prorrogado: isSim(p.prorrogado),
    inicioPrazo: p.inicioPrazo ?? null,
    fimPrazo: p.fimPrazo ?? null,
  };
}

// ---------- domínios ----------
async function syncDominios(db: TablesDB): Promise<EtapaResultado> {
  return etapa(db, "dominios", async () => {
    const tabelas: Array<[string, () => Promise<DominioItem[]>]> = [
      ["tipos-situacao", senado.tiposSituacao],
      ["tipos-decisao", senado.tiposDecisao],
      ["tipos-autor", senado.tiposAutor],
      ["tipos-atualizacao", senado.tiposAtualizacao],
      ["tipos-documento", senado.tiposDocumento],
      ["tipos-prazo", senado.tiposPrazo],
      ["classes", senado.classes],
      ["destinos", senado.destinos],
      ["siglas", senado.siglas],
    ];
    let count = 0;
    for (const [nome, fn] of tabelas) {
      try {
        const itens = await fn();
        for (const it of itens) {
          const chave = String(it.id ?? it.sigla ?? count);
          await upsert(db, "senado_dominio", `${nome}-${chave}`.slice(0, 36), {
            tabela: nome,
            sigla: it.sigla ?? null,
            descricao: it.descricao ?? null,
            codigo: typeof it.id === "number" ? it.id : null,
          });
          count++;
        }
      } catch {
        // tabela indisponível -> segue
      }
    }
    return count;
  });
}

// ---------- processos + relacionados ----------
async function syncProcessoRelacionados(db: TablesDB, idProcesso: number): Promise<void> {
  try {
    const rels = await senado.relatorias({ idProcesso });
    for (const r of rels) await upsert(db, "senado_relatoria", String(r.id), mapRelatoria(r));
  } catch { /* segue */ }
  try {
    const prazos = await senado.prazos({ idProcesso });
    for (const p of prazos) await upsert(db, "senado_prazo", String(p.id), mapPrazo(p));
  } catch { /* segue */ }
}

async function syncProcessos(db: TablesDB): Promise<EtapaResultado> {
  return etapa(db, "processos", async () => {
    let count = 0;
    for (const ano of ANOS) {
      for (const sigla of SIGLAS) {
        const termos = TERMOS.length ? TERMOS : [undefined];
        for (const termo of termos) {
          try {
            const procs = await senado.processos({ sigla, ano, tramitando: "S", termo });
            for (const p of procs) {
              await upsert(db, "senado_processo", String(p.id), mapProcesso(p));
              await syncProcessoRelacionados(db, p.id);
              count++;
            }
          } catch {
            // combinação sem resultado ou erro pontual -> segue
          }
        }
      }
    }
    return count;
  });
}

// ---------- Senadores em exercício (adição — dados de contato) ----------
interface TelefoneApi {
  NumeroTelefone?: string;
}
interface ParlamentarApi {
  IdentificacaoParlamentar?: {
    CodigoParlamentar?: string;
    NomeParlamentar?: string;
    NomeCompletoParlamentar?: string;
    SexoParlamentar?: string;
    FormaTratamento?: string;
    UrlFotoParlamentar?: string;
    UrlPaginaParlamentar?: string;
    EmailParlamentar?: string;
    SiglaPartidoParlamentar?: string;
    UfParlamentar?: string;
    Telefones?: { Telefone?: TelefoneApi[] | TelefoneApi };
  };
}

/** /senador/lista/atual não é da seção Processo — é o cadastro de parlamentares
 * do mesmo host do Senado, formato legado (JSON derivado de XML, PascalCase). */
async function fetchSenadoresAtuais(): Promise<ParlamentarApi[]> {
  const res = await fetch(`${SENADO_BASE_URL}/senador/lista/atual`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} em /senador/lista/atual`);
  const json = await res.json();
  const lista = json?.ListaParlamentarEmExercicio?.Parlamentares?.Parlamentar;
  if (!lista) return [];
  return Array.isArray(lista) ? lista : [lista];
}

function primeiroTelefone(tel?: { Telefone?: TelefoneApi[] | TelefoneApi }): string | null {
  if (!tel?.Telefone) return null;
  const t = Array.isArray(tel.Telefone) ? tel.Telefone[0] : tel.Telefone;
  return t?.NumeroTelefone ?? null;
}

async function syncSenadores(db: TablesDB): Promise<EtapaResultado> {
  return etapa(db, "senadores", async () => {
    const parlamentares = await fetchSenadoresAtuais();
    let count = 0;
    for (const p of parlamentares) {
      const id = p.IdentificacaoParlamentar;
      if (!id?.CodigoParlamentar) continue;
      await upsert(db, "senado_senador", id.CodigoParlamentar, {
        codigoParlamentar: Number(id.CodigoParlamentar),
        nome: id.NomeParlamentar ?? null,
        nomeCompleto: id.NomeCompletoParlamentar ?? null,
        sexo: id.SexoParlamentar ?? null,
        formaTratamento: id.FormaTratamento?.trim() ?? null,
        partido: id.SiglaPartidoParlamentar ?? null,
        uf: id.UfParlamentar ?? null,
        email: id.EmailParlamentar ?? null,
        telefone: primeiroTelefone(id.Telefones),
        urlFoto: id.UrlFotoParlamentar ?? null,
        urlPagina: id.UrlPaginaParlamentar ?? null,
        sincronizadoEm: new Date().toISOString(),
      });
      count++;
    }
    return count;
  });
}

// ---------- orquestradores ----------
export interface SyncResultado {
  modo: "full" | "delta" | "senadores";
  iniciadoEm: string;
  concluidoEm: string;
  config: { siglas: string[]; anos: number[]; termos: string[] };
  etapas: EtapaResultado[];
}

export async function fullSync(): Promise<SyncResultado> {
  const db = adminDb();
  const iniciadoEm = new Date().toISOString();
  const etapas: EtapaResultado[] = [];
  etapas.push(await syncDominios(db));
  etapas.push(await syncProcessos(db));
  return {
    modo: "full", iniciadoEm, concluidoEm: new Date().toISOString(),
    config: { siglas: SIGLAS, anos: ANOS, termos: TERMOS }, etapas,
  };
}

/** Delta: processos atualizados nos últimos `numdias` (máx. 30), tramitando=S. */
export async function deltaSync(numdias = 1): Promise<SyncResultado> {
  const db = adminDb();
  const iniciadoEm = new Date().toISOString();
  const dias = Math.min(Math.max(numdias, 1), 30);

  const etapa1 = await etapa(db, "delta", async () => {
    let count = 0;
    for (const sigla of SIGLAS) {
      try {
        const procs = await senado.processos({ sigla, tramitando: "S", numdias: dias });
        for (const p of procs) {
          await upsert(db, "senado_processo", String(p.id), mapProcesso(p));
          await syncProcessoRelacionados(db, p.id);
          count++;
        }
      } catch { /* segue */ }
    }
    return count;
  });

  return {
    modo: "delta", iniciadoEm, concluidoEm: new Date().toISOString(),
    config: { siglas: SIGLAS, anos: ANOS, termos: TERMOS }, etapas: [etapa1],
  };
}

/** Lista de senadores em exercício (cadastro + contato) — full refresh, tabela pequena (~81). */
export async function senadoresSync(): Promise<SyncResultado> {
  const db = adminDb();
  const iniciadoEm = new Date().toISOString();
  const etapas = [await syncSenadores(db)];
  return {
    modo: "senadores", iniciadoEm, concluidoEm: new Date().toISOString(),
    config: { siglas: SIGLAS, anos: ANOS, termos: TERMOS }, etapas,
  };
}

/** Utilitário: processos com prazo vencendo nos próximos N dias (para alertas). */
export async function prazosProximos(dias = 15) {
  const db = adminDb();
  const limite = new Date(Date.now() + dias * 86_400_000).toISOString().slice(0, 10);
  const hoje = new Date().toISOString().slice(0, 10);
  return db.listRows({
    databaseId: DB,
    tableId: "senado_prazo",
    queries: [
      Query.greaterThanEqual("fimPrazo", hoje),
      Query.lessThanEqual("fimPrazo", limite),
      Query.limit(200),
    ],
  });
}
