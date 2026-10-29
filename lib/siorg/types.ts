// src/lib/siorg/types.ts
// Tipos da API SIORG (Estrutura Organizacional do Governo Federal).
// Base: https://estruturaorganizacional.dados.gov.br/doc
// Amostras reais em /samples. Coletado em 2026-09-06 (versaoServico 4.0.2).

/** Envelope de metadados presente em toda resposta da API. */
export interface SiorgServico {
  codigoErro: number; // 0 = sucesso; 102 não encontrado; 103 versão inválida; 104 deve ser órgão/entidade
  mensagem: string;
  data: string; // "YYYY-MM-DD"
  versaoServico: string;
  ipRequisitante: string | null;
  ticket: string | null;
}

/** Resposta genérica: sempre { servico, [chaveDeDados]: ... }. */
export type SiorgEnvelope<T> = { servico: SiorgServico } & T;

export type SimNao = "SIM" | "NAO";

// ---------- Domínios / tabelas básicas ----------
export interface Poder {
  codigoPoder: number;
  descricaoPoder: string;
  ativo: SimNao;
}
export interface Esfera {
  codigoEsfera: number;
  descricaoEsfera: string;
  ativo: SimNao;
}
export interface NaturezaJuridica {
  codigoNaturezaJuridica: number;
  descricaoNaturezaJuridica: string;
  ativo: SimNao;
}
export interface SubNaturezaJuridica {
  /** Vem como URI para a natureza — usar extractId(). */
  codigoNaturezaJuridica: string;
  codigoSubNaturezaJuridica: number;
  descricaoSubNaturezaJuridica: string;
  ativo: SimNao;
}
export interface TipoUnidade {
  /** Código alfanumérico, ex.: "OR", "EN", "UA", "UC", "ET". */
  codigoTipoUnidade: string;
  descricaoTipoUnidade: string;
}
export interface CategoriaUnidade {
  codigoCategoriaUnidade: number;
  descricaoCategoriaUnidade: string;
  ativo: SimNao;
}

// ---------- Unidade organizacional ----------
/** Campos de código chegam como URIs (linked data). Extrair último segmento. */
export interface UnidadeOrganizacional {
  codigoUnidade: string;
  codigoUnidadePai: string | null;
  codigoOrgaoEntidade: string | null;
  codigoTipoUnidade: string;
  nome: string;
  sigla: string | null;
  codigoEsfera: string | null;
  codigoPoder: string | null;
  codigoNaturezaJuridica: string | null;
  codigoSubNaturezaJuridica: string | null;
  codigoCategoriaUnidade?: string | null;
  nivelNormatizacao?: string | null;
  regulamentoEspecifico?: string | null;
  versaoConsulta?: string | null;
  dataInicialVersaoConsulta?: string | null;
  dataFinalVersaoConsulta?: string | null;
  operacao?: string | null;
  codigoUnidadePaiAnterior?: string | null;
  codigoOrgaoEntidadeAnterior?: string | null;
}

/** Nó da árvore recursiva de /unidade-organizacional/{cod}/estrutura. */
export interface EstruturaNo {
  codigoUnidade: number;
  estrutura: EstruturaNo[];
}

// ---------- Delta ----------
export interface AlteracaoItem {
  codigo: string;
  versao: string;
  estruturaPerfeita: boolean;
}
export interface AlteracoesResposta {
  versaoReferencia: string;
  versaoAtual: string;
  orgaoEntidadeIncluido?: AlteracaoItem[];
  orgaoEntidadeAlterado?: AlteracaoItem[];
  orgaoEntidadeExcluido?: AlteracaoItem[];
}

// ---------- Cargos / funções ----------
export interface AtoNormativo {
  tipoAto?: string;
  codigoUnidade?: number;
  numero?: string;
  dataAssinatura?: string;
  dataPublicacao?: string;
  dataVigencia?: string;
  ementa?: string;
  url?: string;
  codigoTipo?: number;
  siglaTipo?: string;
}
export interface CargoFuncaoItem {
  codigoCargoFuncao: number;
  categoria: string | null;
  nivel: string | null;
  regraAutoridade: string | null;
  denominacoes?: { denominacao: Array<{ codigo: number; descricao: string }> };
}
export interface TipoCargoFuncao {
  codigoTipo: number;
  nome: string;
  sigla: string;
  atoNormativo?: AtoNormativo;
  cargosFuncoes?: { cargoFuncao: CargoFuncaoItem[] };
}

// ---------- Colegiado ----------
export interface IntegranteColegiado {
  outraRepresentatividade: string | null;
  unidadeResumida: UnidadeOrganizacional;
}

// ---------- Instâncias / ocupantes (contém PII — ver doc §6) ----------
export interface InstanciaOcupante {
  codigoInstancia: number;
  nomeTitular: string | null;
  cpfTitular: string | null;
}

export interface CargoInstancias {
  denominacao: string;
  funcao: string;
  instancias: InstanciaOcupante[];
}

/** Resposta de /instancias/consulta-unidade — nomeTitular vem consistentemente
 * null nesta API pública (confirmado em produção); cpfTitular NUNCA é lido/persistido. */
export interface UnidadeInstancias {
  codigoUnidade: number;
  nomeUnidade: string;
  siglaUnidade?: string;
  municipio?: string;
  uf?: string;
  cargos: CargoInstancias[];
}

// ---------- Endereço e contato ----------
export interface SiorgEndereco {
  logradouro: string | null;
  numero: number | null;
  complemento: string | null;
  bairro: string | null;
  cep: number | null;
  uf: string | null;
  municipio: number | null;
  pais: number | null;
  tipoEndereco: string | null;
  horarioDeFuncionamento: string | null;
}
export interface SiorgContatoSite {
  tipo: string | null;
  site: string | null;
  outroTipoSite: string | null;
}
export interface SiorgContato {
  telefone?: string[];
  email?: string[];
  site?: SiorgContatoSite[];
}
/** /unidade-organizacional/{cod}/endereco-contato devolve DUAS chaves de
 * dados (`endereco` e `contato`) no mesmo envelope — não usar o helper `get()`
 * genérico de chave única para este endpoint. */
export interface EnderecoContatoResposta {
  endereco?: SiorgEndereco[];
  contato?: SiorgContato[];
}
