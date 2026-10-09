// lib/siorg/sync.ts
// Motor de sincronização SIORG -> Appwrite (database `relgov`). SÓ SERVIDOR.
// Full sync (domínios, órgãos, cargos, colegiados) + delta via /alteracoes.
//
// Adaptado para a API `TablesDB` do node-appwrite (v17+) — a mesma usada no
// resto do RelGov (ver scripts/setup-appwrite.mjs) — o módulo original usava
// a API clássica `Databases`, incompatível com o SDK instalado aqui.

import { Client, TablesDB, ID, Query } from "node-appwrite";
import { siorg, extractId, extractNumericId, SiorgError } from "./client";
import type { UnidadeOrganizacional } from "./types";

const DB = process.env.APPWRITE_DATABASE_ID ?? "relgov";

export function adminDb(): TablesDB {
  const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!;
  const project = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!;
  const apiKey = process.env.APPWRITE_API_KEY!;
  const client = new Client().setEndpoint(endpoint).setProject(project).setKey(apiKey);
  return new TablesDB(client);
}

/** ID de linha do Appwrite: máx. 36 chars, [a-zA-Z0-9._-], não começa com "_". */
function safeDocId(raw: string): string {
  let s = String(raw).replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 36);
  if (s.startsWith("_")) s = "id" + s.slice(1);
  return s || ID.unique();
}

/** Upsert idempotente por rowId. */
async function upsert(
  db: TablesDB,
  tableId: string,
  rowId: string,
  data: Record<string, unknown>,
): Promise<void> {
  const id = safeDocId(rowId);
  try {
    await db.updateRow({ databaseId: DB, tableId, rowId: id, data });
  } catch (err: unknown) {
    const code = (err as { code?: number })?.code;
    if (code === 404) {
      await db.createRow({ databaseId: DB, tableId, rowId: id, data });
    } else {
      throw err;
    }
  }
}

const isSim = (v?: string | null) => v === "SIM";

export interface EtapaResultado {
  recurso: string;
  registros: number;
  status: "ok" | "erro";
  erro?: string;
}

async function registrarMeta(
  db: TablesDB,
  recurso: string,
  registros: number,
  status: "ok" | "erro",
  versaoReferencia?: string,
): Promise<void> {
  const data: Record<string, unknown> = {
    recurso,
    ultimoSyncEm: new Date().toISOString(),
    ultimoStatus: status,
    registros,
  };
  if (versaoReferencia !== undefined) data.ultimaVersaoReferencia = versaoReferencia;
  await upsert(db, "siorg_sync_meta", recurso, data).catch(() => {});
}

/** Executa uma etapa protegendo o pipeline (falha parcial não aborta o resto). */
async function etapa(
  db: TablesDB,
  recurso: string,
  fn: () => Promise<number>,
): Promise<EtapaResultado> {
  try {
    const registros = await fn();
    await registrarMeta(db, recurso, registros, "ok");
    return { recurso, registros, status: "ok" };
  } catch (err) {
    const msg = err instanceof SiorgError ? err.message : String(err);
    await registrarMeta(db, recurso, 0, "erro");
    return { recurso, registros: 0, status: "erro", erro: msg };
  }
}

// ---------- Domínios ----------
async function syncDominios(db: TablesDB): Promise<EtapaResultado[]> {
  const res: EtapaResultado[] = [];

  res.push(await etapa(db, "poder", async () => {
    const { data } = await siorg.poder();
    for (const p of data)
      await upsert(db, "siorg_poder", String(p.codigoPoder), {
        codigo: p.codigoPoder, descricao: p.descricaoPoder, ativo: isSim(p.ativo),
      });
    return data.length;
  }));

  res.push(await etapa(db, "esfera", async () => {
    const { data } = await siorg.esfera();
    for (const e of data)
      await upsert(db, "siorg_esfera", String(e.codigoEsfera), {
        codigo: e.codigoEsfera, descricao: e.descricaoEsfera, ativo: isSim(e.ativo),
      });
    return data.length;
  }));

  res.push(await etapa(db, "natureza_juridica", async () => {
    const { data } = await siorg.naturezaJuridica();
    for (const n of data)
      await upsert(db, "siorg_natureza_juridica", String(n.codigoNaturezaJuridica), {
        codigo: n.codigoNaturezaJuridica, descricao: n.descricaoNaturezaJuridica, ativo: isSim(n.ativo),
      });
    return data.length;
  }));

  res.push(await etapa(db, "subnatureza_juridica", async () => {
    const { data } = await siorg.subNaturezaJuridica();
    for (const s of data)
      await upsert(db, "siorg_subnatureza_juridica", String(s.codigoSubNaturezaJuridica), {
        codigo: s.codigoSubNaturezaJuridica,
        descricao: s.descricaoSubNaturezaJuridica,
        naturezaRef: extractId(s.codigoNaturezaJuridica),
        ativo: isSim(s.ativo),
      });
    return data.length;
  }));

  res.push(await etapa(db, "tipo_unidade", async () => {
    const { data } = await siorg.tipoUnidade();
    for (const t of data)
      await upsert(db, "siorg_tipo_unidade", String(t.codigoTipoUnidade), {
        codigo: t.codigoTipoUnidade, descricao: t.descricaoTipoUnidade,
      });
    return data.length;
  }));

  res.push(await etapa(db, "categoria_unidade", async () => {
    const { data } = await siorg.categoriaUnidade();
    for (const c of data)
      await upsert(db, "siorg_categoria_unidade", String(c.codigoCategoriaUnidade), {
        codigo: c.codigoCategoriaUnidade, descricao: c.descricaoCategoriaUnidade, ativo: isSim(c.ativo),
      });
    return data.length;
  }));

  return res;
}

// ---------- Unidade ----------
function mapUnidade(u: UnidadeOrganizacional, isOrgaoEntidade: boolean): Record<string, unknown> {
  return {
    nome: u.nome,
    sigla: u.sigla ?? null,
    paiRef: extractId(u.codigoUnidadePai),
    orgaoEntidadeRef: extractId(u.codigoOrgaoEntidade),
    tipoUnidadeRef: extractId(u.codigoTipoUnidade),
    esferaRef: extractId(u.codigoEsfera),
    poderRef: extractId(u.codigoPoder),
    naturezaRef: extractId(u.codigoNaturezaJuridica),
    subnaturezaRef: extractId(u.codigoSubNaturezaJuridica),
    categoriaRef: extractId(u.codigoCategoriaUnidade),
    nivelNormatizacao: u.nivelNormatizacao ?? null,
    versaoConsulta: u.versaoConsulta ?? null,
    dataInicialVersao: u.dataInicialVersaoConsulta ?? null,
    isOrgaoEntidade,
    ativo: true,
  };
}

async function upsertUnidade(db: TablesDB, u: UnidadeOrganizacional, isOrgao: boolean) {
  const id = extractNumericId(u.codigoUnidade);
  if (id == null) return false;
  await upsert(db, "siorg_unidade", String(id), mapUnidade(u, isOrgao));
  return true;
}

/** Órgãos e entidades para cada combinação poder×esfera definida no ambiente. */
async function syncOrgaosEntidades(db: TablesDB): Promise<EtapaResultado> {
  return etapa(db, "orgao_entidade", async () => {
    const poderes = (process.env.SIORG_PODERES ?? "1").split(",").map((s) => Number(s.trim()));
    const esferas = (process.env.SIORG_ESFERAS ?? "1").split(",").map((s) => Number(s.trim()));
    let count = 0;
    for (const poder of poderes) {
      for (const esfera of esferas) {
        const { data } = await siorg.orgaoEntidadeResumida(poder, esfera);
        for (const u of data) if (await upsertUnidade(db, u, true)) count++;
      }
    }
    return count;
  });
}

/** Estrutura completa (todas as unidades) de cada órgão já carregado. */
async function syncEstruturaCompleta(db: TablesDB): Promise<EtapaResultado> {
  return etapa(db, "estrutura_completa", async () => {
    // busca os órgãos raiz já persistidos
    const orgaos = await db.listRows({
      databaseId: DB,
      tableId: "siorg_unidade",
      queries: [Query.equal("isOrgaoEntidade", true), Query.limit(500)],
    });
    let count = 0;
    for (const org of orgaos.rows) {
      const cod = org.$id;
      try {
        const { data } = await siorg.estruturaFilha(cod, "NAO");
        for (const u of data) if (await upsertUnidade(db, u, false)) count++;
      } catch {
        // 502/registro sem filhas -> segue
      }
    }
    return count;
  });
}

// ---------- Cargos / funções ----------
async function syncCargos(db: TablesDB): Promise<EtapaResultado> {
  return etapa(db, "cargo_funcao", async () => {
    const { data } = await siorg.cargoFuncao();
    let count = 0;
    for (const tipo of data) {
      const cargos = tipo.cargosFuncoes?.cargoFuncao ?? [];
      for (const c of cargos) {
        const denom = c.denominacoes?.denominacao?.[0]?.descricao ?? tipo.nome;
        await upsert(db, "siorg_cargo_funcao", String(c.codigoCargoFuncao), {
          denominacao: denom,
          sigla: tipo.sigla ?? null,
          nivel: c.nivel ?? null,
          categoria: c.categoria ?? null,
          tipoCodigo: tipo.codigoTipo ?? null,
          tipoNome: tipo.nome ?? null,
          regraAutoridade: c.regraAutoridade ?? null,
          atoNormativoJson: tipo.atoNormativo ? JSON.stringify(tipo.atoNormativo) : null,
        });
        count++;
      }
    }
    return count;
  });
}

// ---------- Colegiados ----------
/** Sincroniza integrantes dos colegiados (unidades tipo colegiado já carregadas). */
async function syncColegiados(db: TablesDB): Promise<EtapaResultado> {
  return etapa(db, "colegiado", async () => {
    const colegiados = await db.listRows({
      databaseId: DB,
      tableId: "siorg_unidade",
      queries: [Query.equal("tipoUnidadeRef", ["colegiado", "UC"]), Query.limit(500)],
    });
    let count = 0;
    for (const col of colegiados.rows) {
      const cod = col.$id;
      try {
        const { data } = await siorg.colegiado(cod);
        for (const integ of data) {
          const unidadeRef = extractId(integ.unidadeResumida?.codigoUnidade);
          await upsert(
            db,
            "siorg_colegiado_integrante",
            `${cod}-${unidadeRef ?? ID.unique()}`,
            {
              colegiadoRef: cod,
              unidadeRef,
              nome: integ.unidadeResumida?.nome ?? null,
              outraRepresentatividade: integ.outraRepresentatividade ?? null,
            },
          );
          count++;
        }
      } catch {
        // segue
      }
    }
    return count;
  });
}

// ---------- Endereço / contato ----------
/** Endereço, telefone e e-mail de cada órgão/entidade (não desce para toda unidade — custaria 1 req/unidade em ~2500 unidades). */
export async function syncEnderecosOrgaos(db: TablesDB): Promise<EtapaResultado> {
  return etapa(db, "endereco_contato", async () => {
    const orgaos = await db.listRows({
      databaseId: DB,
      tableId: "siorg_unidade",
      queries: [Query.equal("isOrgaoEntidade", true), Query.limit(500)],
    });
    let count = 0;
    for (const org of orgaos.rows) {
      const cod = org.$id;
      try {
        const resp = await siorg.enderecoContato(cod);
        const endereco = resp.endereco?.[0];
        const contato = resp.contato?.[0];
        if (!endereco && !contato) continue;
        await upsert(db, "siorg_endereco_contato", cod, {
          logradouro: endereco?.logradouro ?? null,
          numero: endereco?.numero != null ? String(endereco.numero) : null,
          complemento: endereco?.complemento ?? null,
          bairro: endereco?.bairro ?? null,
          cep: endereco?.cep != null ? String(endereco.cep) : null,
          uf: endereco?.uf ?? null,
          municipio: endereco?.municipio != null ? String(endereco.municipio) : null,
          tipoEndereco: endereco?.tipoEndereco ?? null,
          horarioDeFuncionamento: endereco?.horarioDeFuncionamento ?? null,
          telefonesJson: contato?.telefone ? JSON.stringify(contato.telefone) : null,
          emailsJson: contato?.email ? JSON.stringify(contato.email) : null,
          siteJson: contato?.site ? JSON.stringify(contato.site) : null,
        });
        count++;
      } catch {
        // endpoint intermitente (502) ou sem endereço cadastrado -> segue
      }
    }
    return count;
  });
}

// ---------- Orquestradores ----------
export interface SyncResultado {
  modo: "full" | "delta";
  iniciadoEm: string;
  concluidoEm: string;
  etapas: EtapaResultado[];
}

export async function fullSync(): Promise<SyncResultado> {
  const db = adminDb();
  const iniciadoEm = new Date().toISOString();
  const etapas: EtapaResultado[] = [];

  etapas.push(...(await syncDominios(db)));
  etapas.push(await syncOrgaosEntidades(db));
  etapas.push(await syncEstruturaCompleta(db));
  etapas.push(await syncCargos(db));
  etapas.push(await syncColegiados(db));
  etapas.push(await syncEnderecosOrgaos(db));

  // guarda a versão atual como referência inicial do delta
  try {
    const { data } = await siorg.alteracoes(1);
    await registrarMeta(db, "__delta_cursor__", 0, "ok", data.versaoAtual);
  } catch {
    /* delta cursor será inicializado no primeiro delta bem-sucedido */
  }

  return { modo: "full", iniciadoEm, concluidoEm: new Date().toISOString(), etapas };
}

export async function deltaSync(): Promise<SyncResultado> {
  const db = adminDb();
  const iniciadoEm = new Date().toISOString();
  const etapas: EtapaResultado[] = [];

  const etapaDelta = await etapa(db, "delta", async () => {
    // lê o cursor salvo
    let versaoReferencia = "1";
    try {
      const meta = await db.getRow({ databaseId: DB, tableId: "siorg_sync_meta", rowId: "__delta_cursor__" });
      versaoReferencia = (meta as { ultimaVersaoReferencia?: string }).ultimaVersaoReferencia ?? "1";
    } catch {
      /* sem cursor: usa "1" (pega tudo) */
    }

    const { data } = await siorg.alteracoes(versaoReferencia);
    const alterados = [
      ...(data.orgaoEntidadeIncluido ?? []),
      ...(data.orgaoEntidadeAlterado ?? []),
    ];

    let count = 0;
    for (const item of alterados) {
      try {
        const { data: u } = await siorg.unidadeCompleta(item.codigo);
        if (await upsertUnidade(db, u, true)) count++;
      } catch {
        // 502/erro pontual: segue; será repescado no próximo delta
      }
    }

    // marca excluídos como inativos
    for (const item of data.orgaoEntidadeExcluido ?? []) {
      try {
        await db.updateRow({
          databaseId: DB,
          tableId: "siorg_unidade",
          rowId: safeDocId(item.codigo),
          data: { ativo: false },
        });
      } catch {
        /* ignora se não existir */
      }
    }

    // avança o cursor
    await registrarMeta(db, "__delta_cursor__", count, "ok", data.versaoAtual);
    return count;
  });

  etapas.push(etapaDelta);
  return { modo: "delta", iniciadoEm, concluidoEm: new Date().toISOString(), etapas };
}
