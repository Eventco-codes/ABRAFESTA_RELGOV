export const APPWRITE_DATABASE_ID =
  process.env.APPWRITE_DATABASE_ID ?? "relgov";

// IDs das tabelas (Appwrite TablesDB) — ver scripts/setup-appwrite.ts
export const TABLES = {
  pautas: "pautas",
  encaminhamentos: "encaminhamentos",
  pendencias: "pendencias",
  movimentacoes: "movimentacoes",
  resumosSemanais: "resumos_semanais",
  emailLogs: "email_logs",
  anexos: "anexos",
  pendenciaAnexos: "pendencia_anexos",
  ministerioProjetos: "ministerio_projetos",
  ministerioProjetoResponsaveis: "ministerio_projeto_responsaveis",
  ministerioProjetoAnexos: "ministerio_projeto_anexos",
  ministerioDirecao: "ministerio_direcao",
} as const;

/** Bucket do Appwrite Storage para documentos anexados a pautas/movimentações. */
export const STORAGE_BUCKET_ID = "documentos";

/** Tabelas do sync Câmara dos Deputados (ver scripts/camara/) — espelho somente-leitura da API pública, fora do domínio pautas/pendências. */
export const CAMARA_TABLES = {
  deputados: "deputados",
  deputadoFrentes: "deputado_frentes",
  deputadoOrgaos: "deputado_orgaos",
  proposicoes: "proposicoes",
  tramitacoes: "tramitacoes",
  refSituacoesProposicao: "ref_situacoes_proposicao",
  orgaos: "orgaos",
  partidos: "partidos",
  partidoLideres: "partido_lideres",
  legislaturaLideres: "legislatura_lideres",
} as const;

/** Tabelas do sync SIORG (estrutura organizacional do governo federal) — ver scripts/setup-siorg-tables.mjs. */
export const SIORG_TABLES = {
  poder: "siorg_poder",
  esfera: "siorg_esfera",
  naturezaJuridica: "siorg_natureza_juridica",
  subnaturezaJuridica: "siorg_subnatureza_juridica",
  tipoUnidade: "siorg_tipo_unidade",
  categoriaUnidade: "siorg_categoria_unidade",
  unidade: "siorg_unidade",
  cargoFuncao: "siorg_cargo_funcao",
  colegiadoIntegrante: "siorg_colegiado_integrante",
  enderecoContato: "siorg_endereco_contato",
  syncMeta: "siorg_sync_meta",
} as const;

export const LABELS = {
  administrador: "administrador",
  coordenadorRelgov: "coordenadorrelgov",
  leitor: "leitor",
} as const;

export type RelgovRole = (typeof LABELS)[keyof typeof LABELS];

export const ALL_ROLE_LABELS: RelgovRole[] = Object.values(LABELS);

/**
 * Acesso ao RelGov só existe para quem foi convidado pelo Administrador
 * (ganhou um dos Labels acima). Login sem Label — inclusive via Google,
 * que poderia criar conta nova automaticamente — é sempre recusado aqui.
 */
export function hasRelgovAccess(labels: string[]): boolean {
  return labels.some((label) => ALL_ROLE_LABELS.includes(label as RelgovRole));
}

export const SESSION_COOKIE_NAME = "relgov_session";
