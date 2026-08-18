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
