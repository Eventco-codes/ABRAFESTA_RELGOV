export type Prioridade = "Alta" | "Media" | "Baixa";

export type OrigemMovimentacao = "VARREDURA_AUTOMATICA" | "REGISTRO_MANUAL";

export type StatusEmailLog = "RASCUNHO" | "ENVIADO" | "FALHA";

/** Campos de sistema presentes em toda linha do Appwrite TablesDB (Models.Row). */
export interface RelgovRow {
  $id: string;
  $sequence: string;
  $tableId: string;
  $databaseId: string;
  $createdAt: string;
  $updatedAt: string;
  $permissions: string[];
}

export interface Pauta extends RelgovRow {
  titulo: string;
  eixo: string;
  atuacao: string;
  contexto: string;
  situacaoAtual: string;
  interlocutores: string;
  prioridade: Prioridade;
  fonteReferencia: string;
  status: string;
  linkOficial: string | null;
  ativo: boolean;
  /** Identificação da Proposição — dados formais da proposição oficial (quando aplicável). */
  autor: string | null;
  dataApresentacao: string | null;
  ementa: string | null;
  /** Data da última movimentação em tramitação (fonte oficial) — distinta do histórico de `movimentacoes`. */
  dataUltimaMovimentacao: string | null;
  /** Controle manual (cadastro da pauta) de inclusão na área Tramitação — substitui a heurística por título. */
  incluirTramitacao: boolean;
  /** Soft delete: quando preenchido, a pauta some do painel; exclusão definitiva após 30 dias (ver purgarPautasExcluidasVencidas). */
  excluidoEm: string | null;
}

export interface Encaminhamento extends RelgovRow {
  pautaId: string;
  texto: string;
  ordem: number;
  concluido: boolean;
  concluidoEm: string | null;
  concluidoPorNome: string | null;
}

export interface Pendencia extends RelgovRow {
  /** Nem toda pendência tem uma pauta legislativa correspondente — várias são
   * acompanhamento institucional (ofícios, representação, alinhamentos). */
  pautaId: string | null;
  descricao: string;
  responsavel: string;
  ultimaMovimentacao: string;
  status: string;
  prioridade: Prioridade;
  proximaCobranca: string;
  prazoSugerido: string;
  evidencia: string;
  observacoes: string;
  comentario: string | null;
}

export interface PendenciaAnexo extends RelgovRow {
  pendenciaId: string;
  fileId: string;
  nome: string;
  tamanho: number;
  tipoMime: string | null;
  criadoPorNome: string | null;
}

export interface Movimentacao extends RelgovRow {
  pautaId: string;
  data: string;
  origem: OrigemMovimentacao;
  titulo: string;
  descricao: string;
  criadoPorNome: string | null;
}

export interface ResumoSemanal extends RelgovRow {
  semanaInicio: string;
  semanaFim: string;
  manchete: string;
  lide: string;
}

export interface Anexo extends RelgovRow {
  pautaId: string;
  movimentacaoId: string | null;
  fileId: string;
  nome: string;
  tamanho: number;
  tipoMime: string | null;
  criadoPorNome: string | null;
}

/** Ação/projeto de relações governamentais vinculado a um ministério (cadastro do SIORG). */
export interface MinisterioProjeto extends RelgovRow {
  ministerioId: string;
  ministerioNome: string;
  titulo: string;
  data: string | null;
  contexto: string | null;
  link: string | null;
  criadoPorNome: string | null;
}

export interface MinisterioProjetoResponsavel extends RelgovRow {
  projetoId: string;
  nome: string;
  telefone: string | null;
  email: string | null;
}

export interface MinisterioProjetoAnexo extends RelgovRow {
  projetoId: string;
  fileId: string;
  nome: string;
  tamanho: number;
  tipoMime: string | null;
  criadoPorNome: string | null;
}

/**
 * Contato do Ministro e do Chefe de Gabinete de um ministério — mantido
 * manualmente pela equipe RelGov (o SIORG confirma o cargo, mas não devolve
 * o nome do titular). $id = ministerioId (1 registro por ministério).
 */
export interface MinisterioDirecao extends RelgovRow {
  ministroNome: string | null;
  ministroTelefone: string | null;
  ministroEmail: string | null;
  chefeGabineteNome: string | null;
  chefeGabineteTelefone: string | null;
  chefeGabineteEmail: string | null;
  atualizadoPorNome: string | null;
}

export interface EmailLog extends RelgovRow {
  resumoSemanalId: string;
  destinatarios: string[];
  assunto: string;
  htmlRenderizado: string;
  status: StatusEmailLog;
}
