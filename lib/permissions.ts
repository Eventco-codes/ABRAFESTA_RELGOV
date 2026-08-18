import { LABELS, type RelgovRole } from "@/lib/appwrite/constants";

const { administrador, coordenadorRelgov } = LABELS;

/** Administrador: cria, edita e desativa pautas; gerencia usuários. */
export function canManagePautas(role: RelgovRole | null) {
  return role === administrador;
}

export function canManageUsuarios(role: RelgovRole | null) {
  return role === administrador;
}

/** Administrador + Coordenador RelGov: registram movimentações e cuidam de pendências. */
export function canManagePendencias(role: RelgovRole | null) {
  return role === administrador || role === coordenadorRelgov;
}

export function canRegistrarMovimentacao(role: RelgovRole | null) {
  return role === administrador || role === coordenadorRelgov;
}

export function canRodarMonitoramento(role: RelgovRole | null) {
  return role === administrador || role === coordenadorRelgov;
}
