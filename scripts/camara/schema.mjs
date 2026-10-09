/**
 * schema.mjs — Definição das coleções do RelGov para os dados da
 * API "Dados Abertos da Câmara dos Deputados" (v2).
 *
 * Cada coleção descreve: id, nome, atributos e índices.
 * O provisionamento (appwrite.mjs) cria o que ainda não existe — é idempotente.
 *
 * Tipos de atributo suportados: string | integer | double | boolean | datetime | email | url
 * Campos livres longos (ementa, despacho) usam tamanhos generosos; os mapeadores
 * truncam para o mesmo limite, então schema e dados ficam sempre coerentes.
 *
 * Todos os documentos recebem um $id determinístico (ver mappers.mjs), o que
 * torna o sync um upsert idempotente: rodar de novo atualiza, não duplica.
 */

/**
 * Limites de texto reutilizados pelos mapeadores (mantêm schema e dados
 * alinhados). O Appwrite (MariaDB por trás) limita o tamanho somado das
 * colunas string de uma mesma tabela a ~65KB de linha (utf8mb4, 4 bytes por
 * caractere) — os valores originais do handoff (ementa/ementaDetalhada em
 * 16000 cada, despacho em 8000, keywords em 4000) somados na tabela
 * `proposicoes` estouravam esse limite ("maximum number or size of columns
 * ... has been reached"). Reduzidos para caber com folga; ementas e
 * despachos maiores são truncados pelos mapeadores (SIZES é a fonte única).
 */
export const SIZES = {
  ementa: 2000,
  ementaDetalhada: 4000,
  despacho: 2000,
  keywords: 1000,
  nome: 250,
  descricao: 600,
  url: 500,
};

const ts = { key: 'atualizadoEm', type: 'datetime', required: false }; // carimbo do sync

/** @type {Array<{id:string,name:string,attributes:Array,indexes?:Array}>} */
export const COLLECTIONS = [
  // 1) /deputados  (+ enriquecimento por /deputados/{id})
  {
    id: 'deputados',
    name: 'Deputados',
    attributes: [
      { key: 'camaraId', type: 'integer', required: true },
      { key: 'nome', type: 'string', size: SIZES.nome },
      { key: 'nomeEleitoral', type: 'string', size: SIZES.nome },
      { key: 'nomeCivil', type: 'string', size: SIZES.nome },
      { key: 'siglaPartido', type: 'string', size: 20 },
      { key: 'siglaUf', type: 'string', size: 5 },
      { key: 'idLegislatura', type: 'integer' },
      { key: 'urlFoto', type: 'string', size: SIZES.url },
      { key: 'email', type: 'string', size: 254 },
      { key: 'situacao', type: 'string', size: 60 },
      { key: 'condicaoEleitoral', type: 'string', size: 60 },
      { key: 'sexo', type: 'string', size: 3 },
      { key: 'dataNascimento', type: 'string', size: 20 },
      { key: 'ufNascimento', type: 'string', size: 5 },
      { key: 'escolaridade', type: 'string', size: 120 },
      { key: 'gabineteNome', type: 'string', size: 120 },
      { key: 'gabineteSala', type: 'string', size: 40 },
      { key: 'gabinetePredio', type: 'string', size: 40 },
      { key: 'gabineteAndar', type: 'string', size: 40 },
      { key: 'gabineteTelefone', type: 'string', size: 60 },
      { key: 'gabineteEmail', type: 'string', size: 254 },
      ts,
    ],
    indexes: [
      { key: 'idx_partido', type: 'key', attributes: ['siglaPartido'] },
      { key: 'idx_uf', type: 'key', attributes: ['siglaUf'] },
    ],
  },

  // 2) /deputados/{id}/frentes
  {
    id: 'deputado_frentes',
    name: 'Deputado · Frentes',
    attributes: [
      { key: 'deputadoId', type: 'integer', required: true },
      { key: 'frenteId', type: 'integer', required: true },
      { key: 'frenteTitulo', type: 'string', size: 500 },
      { key: 'idLegislatura', type: 'integer' },
      ts,
    ],
    indexes: [
      { key: 'idx_dep', type: 'key', attributes: ['deputadoId'] },
      { key: 'idx_frente', type: 'key', attributes: ['frenteId'] },
    ],
  },

  // 3) /deputados/{id}/orgaos
  {
    id: 'deputado_orgaos',
    name: 'Deputado · Órgãos',
    attributes: [
      { key: 'deputadoId', type: 'integer', required: true },
      { key: 'idOrgao', type: 'integer', required: true },
      { key: 'siglaOrgao', type: 'string', size: 40 },
      { key: 'nomeOrgao', type: 'string', size: 300 },
      { key: 'titulo', type: 'string', size: 80 },
      { key: 'codTitulo', type: 'string', size: 20 },
      { key: 'dataInicio', type: 'string', size: 30 },
      { key: 'dataFim', type: 'string', size: 30 },
      ts,
    ],
    indexes: [
      { key: 'idx_dep', type: 'key', attributes: ['deputadoId'] },
      { key: 'idx_orgao', type: 'key', attributes: ['idOrgao'] },
    ],
  },

  // 4) /proposicoes  (+ status via /proposicoes/{id})
  {
    id: 'proposicoes',
    name: 'Proposições',
    attributes: [
      { key: 'camaraId', type: 'integer', required: true },
      { key: 'siglaTipo', type: 'string', size: 12 },
      { key: 'codTipo', type: 'integer' },
      { key: 'numero', type: 'integer' },
      { key: 'ano', type: 'integer' },
      { key: 'ementa', type: 'string', size: SIZES.ementa },
      { key: 'ementaDetalhada', type: 'string', size: SIZES.ementaDetalhada },
      { key: 'keywords', type: 'string', size: SIZES.keywords },
      { key: 'dataApresentacao', type: 'string', size: 30 },
      { key: 'statusDataHora', type: 'string', size: 30 },
      { key: 'statusSequencia', type: 'integer' },
      { key: 'statusSiglaOrgao', type: 'string', size: 40 },
      { key: 'statusRegime', type: 'string', size: 160 },
      { key: 'statusDescricaoTramitacao', type: 'string', size: 400 },
      { key: 'statusCodTipoTramitacao', type: 'integer' },
      { key: 'statusDescricaoSituacao', type: 'string', size: 300 },
      { key: 'statusCodSituacao', type: 'integer' },
      { key: 'statusDespacho', type: 'string', size: SIZES.despacho },
      { key: 'statusAmbito', type: 'string', size: 120 },
      { key: 'urlInteiroTeor', type: 'string', size: SIZES.url },
      ts,
    ],
    indexes: [
      { key: 'idx_tipo', type: 'key', attributes: ['siglaTipo'] },
      { key: 'idx_ano', type: 'key', attributes: ['ano'] },
      { key: 'idx_situacao', type: 'key', attributes: ['statusCodSituacao'] },
      { key: 'idx_apresentacao', type: 'key', attributes: ['dataApresentacao'] },
    ],
  },

  // 5) /proposicoes/{id}/tramitacoes
  {
    id: 'tramitacoes',
    name: 'Tramitações',
    attributes: [
      { key: 'proposicaoId', type: 'integer', required: true },
      { key: 'sequencia', type: 'integer', required: true },
      { key: 'dataHora', type: 'string', size: 30 },
      { key: 'siglaOrgao', type: 'string', size: 40 },
      { key: 'regime', type: 'string', size: 160 },
      { key: 'descricaoTramitacao', type: 'string', size: 400 },
      { key: 'codTipoTramitacao', type: 'integer' },
      { key: 'descricaoSituacao', type: 'string', size: 300 },
      { key: 'codSituacao', type: 'integer' },
      { key: 'despacho', type: 'string', size: SIZES.despacho },
      { key: 'url', type: 'string', size: SIZES.url },
      { key: 'ambito', type: 'string', size: 120 },
      ts,
    ],
    indexes: [
      { key: 'idx_prop', type: 'key', attributes: ['proposicaoId'] },
      { key: 'idx_data', type: 'key', attributes: ['dataHora'] },
      { key: 'idx_situacao', type: 'key', attributes: ['codSituacao'] },
    ],
  },

  // 6) /referencias/situacoesProposicao  (tabela de-para, cachear)
  {
    id: 'ref_situacoes_proposicao',
    name: 'Ref · Situações de Proposição',
    attributes: [
      { key: 'cod', type: 'string', size: 12, required: true },
      { key: 'sigla', type: 'string', size: 20 },
      { key: 'nome', type: 'string', size: SIZES.nome },
      { key: 'descricao', type: 'string', size: SIZES.descricao },
      ts,
    ],
    indexes: [
      { key: 'idx_nome', type: 'key', attributes: ['nome'] },
    ],
  },

  // 7) /orgaos
  {
    id: 'orgaos',
    name: 'Órgãos',
    attributes: [
      { key: 'camaraId', type: 'integer', required: true },
      { key: 'sigla', type: 'string', size: 40 },
      { key: 'nome', type: 'string', size: 300 },
      { key: 'apelido', type: 'string', size: 200 },
      { key: 'codTipoOrgao', type: 'integer' },
      { key: 'tipoOrgao', type: 'string', size: 120 },
      { key: 'nomePublicacao', type: 'string', size: 300 },
      { key: 'nomeResumido', type: 'string', size: 200 },
      ts,
    ],
    indexes: [
      { key: 'idx_sigla', type: 'key', attributes: ['sigla'] },
      { key: 'idx_tipo', type: 'key', attributes: ['codTipoOrgao'] },
    ],
  },

  // 8) /partidos  (apoio: necessário para enumerar líderes por partido)
  {
    id: 'partidos',
    name: 'Partidos',
    attributes: [
      { key: 'camaraId', type: 'integer', required: true },
      { key: 'sigla', type: 'string', size: 20 },
      { key: 'nome', type: 'string', size: 120 },
      ts,
    ],
    indexes: [
      { key: 'idx_sigla', type: 'key', attributes: ['sigla'] },
    ],
  },

  // 9) /partidos/{id}/lideres
  {
    id: 'partido_lideres',
    name: 'Partido · Líderes',
    attributes: [
      { key: 'partidoId', type: 'integer', required: true },
      { key: 'deputadoId', type: 'integer', required: true },
      { key: 'deputadoNome', type: 'string', size: SIZES.nome },
      { key: 'titulo', type: 'string', size: 80 },
      { key: 'codTitulo', type: 'integer' },
      { key: 'siglaPartido', type: 'string', size: 20 },
      { key: 'siglaUf', type: 'string', size: 5 },
      { key: 'idLegislatura', type: 'integer' },
      { key: 'email', type: 'string', size: 254 },
      { key: 'urlFoto', type: 'string', size: SIZES.url },
      { key: 'dataInicio', type: 'string', size: 30 },
      { key: 'dataFim', type: 'string', size: 30 },
      ts,
    ],
    indexes: [
      { key: 'idx_partido', type: 'key', attributes: ['partidoId'] },
      { key: 'idx_dep', type: 'key', attributes: ['deputadoId'] },
    ],
  },

  // 10) /legislaturas/{id}/lideres
  {
    id: 'legislatura_lideres',
    name: 'Legislatura · Líderes',
    attributes: [
      { key: 'idLegislatura', type: 'integer', required: true },
      { key: 'deputadoId', type: 'integer' },
      { key: 'deputadoNome', type: 'string', size: SIZES.nome },
      { key: 'siglaPartido', type: 'string', size: 20 },
      { key: 'siglaUf', type: 'string', size: 5 },
      { key: 'titulo', type: 'string', size: 120 },
      { key: 'bancadaTipo', type: 'string', size: 60 },
      { key: 'bancadaNome', type: 'string', size: 120 },
      { key: 'dataInicio', type: 'string', size: 30 },
      { key: 'dataFim', type: 'string', size: 30 },
      { key: 'email', type: 'string', size: 254 },
      { key: 'urlFoto', type: 'string', size: SIZES.url },
      ts,
    ],
    indexes: [
      { key: 'idx_leg', type: 'key', attributes: ['idLegislatura'] },
      { key: 'idx_dep', type: 'key', attributes: ['deputadoId'] },
    ],
  },
];

export const COLLECTION_IDS = Object.fromEntries(COLLECTIONS.map((c) => [c.id, c.id]));
