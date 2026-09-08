// src/lib/senado/types.ts
// Tipos da API de Dados Abertos Legislativos do Senado Federal — seção "Processo".
// Base: https://legis.senado.leg.br/dadosabertos
// Spec: /v3/api-docs (OpenAPI 3.1.0, versão 4.1.3.96). Coletado em 2026-09-06.
//
// NOTA: as respostas são ARRAYS JSON diretos (sem envelope). Datas vêm em
// formatos mistos: "AAAA-MM-DD", "AAAA-MM-DD HH:mm:ss" e ISO com milissegundos.

/** Processo legislativo (item de /processo e /processo/{id}). */
export interface Processo {
  id: number;
  codigoMateria?: number; // código legado (MATE)
  identificacao?: string; // ex.: "PL 123/2024"
  apelido?: string;
  objetivo?: string;
  casaIdentificadora?: string; // SF | CN
  enteIdentificador?: string;
  tipoConteudo?: string;
  ementa?: string;
  idDocumento?: number;
  tipoDocumento?: string;
  dataApresentacao?: string;
  idItemDigital?: number;
  autoria?: string;
  tramitando?: string; // "Sim" | "Não"
  situacaoAtual?: string;
  dataSituacaoAtual?: string;
  dataDeliberacao?: string;
  siglaTipoDeliberacao?: string;
  normaGerada?: string;
  ultimaInformacaoAtualizada?: string;
  dataUltimaAtualizacao?: string; // usado no controle de delta
  urlDocumento?: string;
}

/** Relatoria (item de /processo/relatoria). Inclui dados do parlamentar relator. */
export interface Relatoria {
  id: number;
  casaRelator?: string;
  idTipoRelator?: number;
  descricaoTipoRelator?: string;
  dataDesignacao?: string;
  dataDestituicao?: string | null;
  descricaoTipoEncerramento?: string | null;
  idProcesso?: number;
  numeroAutuacao?: string;
  codigoMateria?: number;
  identificacaoProcesso?: string;
  ementaProcesso?: string;
  autoriaProcesso?: string;
  dataApresentacaoProcesso?: string;
  tramitando?: string;
  codigoParlamentar?: number;
  nomeParlamentar?: string;
  nomeCompleto?: string;
  sexoParlamentar?: string;
  formaTratamentoParlamentar?: string;
  urlFotoParlamentar?: string;
  urlPaginaParlamentar?: string;
  emailParlamentar?: string; // dado público de agente — ver doc §6
  siglaPartidoParlamentar?: string;
  ufParlamentar?: string;
  codigoColegiado?: number;
  siglaCasa?: string;
  siglaColegiado?: string;
  nomeColegiado?: string;
  codigoTipoColegiado?: number;
  dataFimColegiado?: string | null;
}

export interface Documento {
  id: number;
  identificacao?: string;
  dataDocumento?: string;
  dataRecebimento?: string;
  siglaTipo?: string;
  descricaoTipo?: string;
  autoria?: string;
  descricao?: string;
  urlDocumento?: string;
  codigoColegiadoRecebedor?: number;
  casaRecebedora?: string;
  siglaColegiadoRecebedor?: string;
  nomeColegiadoRecebedor?: string;
  idEnteRecebedor?: number;
  casaEnteRecebedor?: string;
  siglaEnteRecebedor?: string;
  nomeEnteRecebedor?: string;
  autores?: AutorDto[];
  apresentadoNosProcessos?: ApresentacaoNoProcessoDto[];
}

export interface Emenda {
  id: number;
  idDocumentoEmenda?: number;
  urlDocumentoEmenda?: string;
  descricaoDocumentoEmenda?: string;
  idProcesso?: number;
  dataApresentacao?: string;
  codigoColegiado?: number;
  casa?: string;
  siglaColegiado?: string;
  nomeColegiado?: string;
  autoria?: string;
  numero?: string;
  identificacao?: string;
  tipo?: string;
  turnoApresentacao?: string;
  decisoes?: DecisaoDto[];
  subemendas?: Emenda[];
}

export interface Prazo {
  id: number;
  idProcesso?: number;
  idTipoPrazo?: number;
  tipoPrazo?: string;
  fundamentoLegal?: string;
  codigoColegiado?: number;
  siglaColegiado?: string;
  nomeColegiado?: string;
  casa?: string;
  siglaTipoFase?: string;
  descricaoTipoFase?: string;
  prorrogado?: string;
  inicioPrazo?: string;
  fimPrazo?: string;
}

export interface AutorDto {
  nome?: string;
  tipo?: string;
  [k: string]: unknown;
}
export interface ApresentacaoNoProcessoDto {
  idProcesso?: number;
  [k: string]: unknown;
}
export interface DecisaoDto {
  sigla?: string;
  descricao?: string;
  data?: string;
  [k: string]: unknown;
}

/** Item genérico de tabela de domínio (situação, decisão, etc.). */
export interface DominioItem {
  id?: number;
  sigla?: string;
  descricao?: string;
  dataInicio?: string;
  dataFim?: string | null;
  [k: string]: unknown;
}

/** Filtros aceitos por /processo (subconjunto usado no monitoramento). */
export interface ProcessoFiltro {
  sigla?: string | string[];
  numero?: string;
  ano?: number;
  tramitando?: "S" | "N";
  siglaSituacao?: string;
  termo?: string;
  casa?: "SF" | "CN";
  dataInicioApresentacao?: string;
  dataFimApresentacao?: string;
  numdias?: number; // 1..30 — atualizados nos últimos N dias (delta)
  alteracao?: string; // só considerado com numdias
  v?: number;
}
