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

export interface EmailLog extends RelgovRow {
  resumoSemanalId: string;
  destinatarios: string[];
  assunto: string;
  htmlRenderizado: string;
  status: StatusEmailLog;
}
