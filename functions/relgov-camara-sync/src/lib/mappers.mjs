/**
 * mappers.mjs — Converte itens da API da Câmara em documentos do Appwrite.
 *
 * Cada mapeador retorna { id, data }:
 *  - `id`  → $id determinístico (torna o sync um upsert; rerodar não duplica)
 *  - `data`→ objeto pronto para gravar, com textos truncados aos limites do schema.
 *
 * Campos ausentes viram null (atributos são opcionais no schema, exceto os
 * marcados required, que sempre vêm da API).
 */

import { SIZES } from './schema.mjs';

const now = () => new Date().toISOString();
const s = (v, n) => (v == null ? null : String(v).slice(0, n));
const i = (v) => (v == null || v === '' ? null : Number.parseInt(v, 10));

// hash curto e estável para compor $id quando há texto livre (título de líder).
function hash(str) {
  let h = 5381;
  for (let k = 0; k < str.length; k++) h = ((h << 5) + h + str.charCodeAt(k)) >>> 0;
  return h.toString(36);
}

/** Compõe um $id válido (<=36 chars, só [a-zA-Z0-9_]). */
export function docId(...parts) {
  const raw = parts
    .filter((p) => p != null && p !== '')
    .map((p) => String(p).replace(/[^a-zA-Z0-9]/g, ''))
    .join('_');
  if (raw.length > 0 && raw.length <= 36) return raw;
  return `x${hash(parts.join('|'))}`.slice(0, 36);
}

const lastId = (uri) => {
  const m = typeof uri === 'string' ? uri.match(/\/(\d+)(?:\?.*)?$/) : null;
  return m ? Number.parseInt(m[1], 10) : null;
};

// ---------------------------------------------------------------------------

export function mapDeputadoLista(d) {
  return {
    id: docId(d.id),
    data: {
      camaraId: i(d.id),
      nome: s(d.nome, SIZES.nome),
      siglaPartido: s(d.siglaPartido, 20),
      siglaUf: s(d.siglaUf, 5),
      idLegislatura: i(d.idLegislatura),
      urlFoto: s(d.urlFoto, SIZES.url),
      email: s(d.email, 254),
      atualizadoEm: now(),
    },
  };
}

/** Campos extras de /deputados/{id} (mesclados por cima do documento da lista). */
export function mapDeputadoDetalhe(d) {
  const st = d.ultimoStatus ?? {};
  const g = st.gabinete ?? {};
  return {
    id: docId(d.id),
    data: {
      camaraId: i(d.id),
      nome: s(st.nome ?? d.nomeCivil, SIZES.nome),
      nomeEleitoral: s(st.nomeEleitoral, SIZES.nome),
      nomeCivil: s(d.nomeCivil, SIZES.nome),
      siglaPartido: s(st.siglaPartido, 20),
      siglaUf: s(st.siglaUf, 5),
      idLegislatura: i(st.idLegislatura),
      urlFoto: s(st.urlFoto, SIZES.url),
      email: s(st.email, 254),
      situacao: s(st.situacao, 60),
      condicaoEleitoral: s(st.condicaoEleitoral, 60),
      sexo: s(d.sexo, 3),
      dataNascimento: s(d.dataNascimento, 20),
      ufNascimento: s(d.ufNascimento, 5),
      escolaridade: s(d.escolaridade, 120),
      gabineteNome: s(g.nome, 120),
      gabineteSala: s(g.sala, 40),
      gabinetePredio: s(g.predio, 40),
      gabineteAndar: s(g.andar, 40),
      gabineteTelefone: s(g.telefone, 60),
      gabineteEmail: s(g.email, 254),
      atualizadoEm: now(),
    },
  };
}

export function mapDeputadoFrente(deputadoId, f) {
  return {
    id: docId(deputadoId, f.id),
    data: {
      deputadoId: i(deputadoId),
      frenteId: i(f.id),
      frenteTitulo: s(f.titulo, 500),
      idLegislatura: i(f.idLegislatura),
      atualizadoEm: now(),
    },
  };
}

export function mapDeputadoOrgao(deputadoId, o) {
  const dataInicioCompact = (o.dataInicio || '').replace(/[^0-9]/g, '').slice(0, 8);
  return {
    id: docId(deputadoId, o.idOrgao, dataInicioCompact),
    data: {
      deputadoId: i(deputadoId),
      idOrgao: i(o.idOrgao),
      siglaOrgao: s(o.siglaOrgao, 40),
      nomeOrgao: s(o.nomeOrgao ?? o.nomePublicacao, 300),
      titulo: s(o.titulo, 80),
      codTitulo: s(o.codTitulo, 20),
      dataInicio: s(o.dataInicio, 30),
      dataFim: s(o.dataFim, 30),
      atualizadoEm: now(),
    },
  };
}

export function mapProposicaoLista(p) {
  return {
    id: docId(p.id),
    data: {
      camaraId: i(p.id),
      siglaTipo: s(p.siglaTipo, 12),
      codTipo: i(p.codTipo),
      numero: i(p.numero),
      ano: i(p.ano),
      ementa: s(p.ementa, SIZES.ementa),
      dataApresentacao: s(p.dataApresentacao, 30),
      atualizadoEm: now(),
    },
  };
}

/** Campos de status/detalhe de /proposicoes/{id} (mesclados por cima da lista). */
export function mapProposicaoDetalhe(p) {
  const st = p.statusProposicao ?? {};
  return {
    id: docId(p.id),
    data: {
      camaraId: i(p.id),
      siglaTipo: s(p.siglaTipo, 12),
      codTipo: i(p.codTipo),
      numero: i(p.numero),
      ano: i(p.ano),
      ementa: s(p.ementa, SIZES.ementa),
      ementaDetalhada: s(p.ementaDetalhada, SIZES.ementaDetalhada),
      keywords: s(p.keywords, SIZES.keywords),
      dataApresentacao: s(p.dataApresentacao, 30),
      statusDataHora: s(st.dataHora, 30),
      statusSequencia: i(st.sequencia),
      statusSiglaOrgao: s(st.siglaOrgao, 40),
      statusRegime: s(st.regime, 160),
      statusDescricaoTramitacao: s(st.descricaoTramitacao, 400),
      statusCodTipoTramitacao: i(st.codTipoTramitacao),
      statusDescricaoSituacao: s(st.descricaoSituacao, 300),
      statusCodSituacao: i(st.codSituacao),
      statusDespacho: s(st.despacho, SIZES.despacho),
      statusAmbito: s(st.ambito, 120),
      urlInteiroTeor: s(p.urlInteiroTeor, SIZES.url),
      atualizadoEm: now(),
    },
  };
}

export function mapTramitacao(proposicaoId, t) {
  return {
    id: docId(proposicaoId, t.sequencia),
    data: {
      proposicaoId: i(proposicaoId),
      sequencia: i(t.sequencia),
      dataHora: s(t.dataHora, 30),
      siglaOrgao: s(t.siglaOrgao, 40),
      regime: s(t.regime, 160),
      descricaoTramitacao: s(t.descricaoTramitacao, 400),
      codTipoTramitacao: i(t.codTipoTramitacao),
      descricaoSituacao: s(t.descricaoSituacao, 300),
      codSituacao: i(t.codSituacao),
      despacho: s(t.despacho, SIZES.despacho),
      url: s(t.url, SIZES.url),
      ambito: s(t.ambito, 120),
      atualizadoEm: now(),
    },
  };
}

export function mapSituacaoProposicao(r) {
  return {
    id: docId(r.cod),
    data: {
      cod: s(r.cod, 12),
      sigla: s(r.sigla, 20),
      nome: s(r.nome, SIZES.nome),
      descricao: s(r.descricao, SIZES.descricao),
      atualizadoEm: now(),
    },
  };
}

export function mapOrgao(o) {
  return {
    id: docId(o.id),
    data: {
      camaraId: i(o.id),
      sigla: s(o.sigla, 40),
      nome: s(o.nome, 300),
      apelido: s(o.apelido, 200),
      codTipoOrgao: i(o.codTipoOrgao),
      tipoOrgao: s(o.tipoOrgao, 120),
      nomePublicacao: s(o.nomePublicacao, 300),
      nomeResumido: s(o.nomeResumido, 200),
      atualizadoEm: now(),
    },
  };
}

export function mapPartido(p) {
  return {
    id: docId(p.id),
    data: {
      camaraId: i(p.id),
      sigla: s(p.sigla, 20),
      nome: s(p.nome, 120),
      atualizadoEm: now(),
    },
  };
}

export function mapPartidoLider(partidoId, l) {
  // Em /partidos/{id}/lideres, `id` é o id do DEPUTADO líder.
  return {
    id: docId(partidoId, l.id, l.codTitulo),
    data: {
      partidoId: i(partidoId),
      deputadoId: i(l.id),
      deputadoNome: s(l.nome, SIZES.nome),
      titulo: s(l.titulo, 80),
      codTitulo: i(l.codTitulo),
      siglaPartido: s(l.siglaPartido, 20),
      siglaUf: s(l.siglaUf, 5),
      idLegislatura: i(l.idLegislatura),
      email: s(l.email, 254),
      urlFoto: s(l.urlFoto, SIZES.url),
      dataInicio: s(l.dataInicio, 30),
      dataFim: s(l.dataFim, 30),
      atualizadoEm: now(),
    },
  };
}

export function mapLegislaturaLider(idLegislatura, l) {
  const par = l.parlamentar ?? {};
  const banc = l.bancada ?? {};
  const depId = par.id ?? lastId(par.uri);
  return {
    id: docId(idLegislatura, depId, hash(`${l.titulo || ''}|${l.dataInicio || ''}`)),
    data: {
      idLegislatura: i(idLegislatura),
      deputadoId: i(depId),
      deputadoNome: s(par.nome, SIZES.nome),
      siglaPartido: s(par.siglaPartido, 20),
      siglaUf: s(par.siglaUf, 5),
      titulo: s(l.titulo, 120),
      bancadaTipo: s(banc.tipo, 60),
      bancadaNome: s(banc.nome, 120),
      dataInicio: s(l.dataInicio, 30),
      dataFim: s(l.dataFim, 30),
      email: s(par.email, 254),
      urlFoto: s(par.urlFoto, SIZES.url),
      atualizadoEm: now(),
    },
  };
}
