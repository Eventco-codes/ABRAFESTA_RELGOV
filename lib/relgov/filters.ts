import { EIXOS_MAE, EIXO_OUTROS, STATUS_PAUTA, eixoMae, statusCanonico } from "@/lib/relgov/taxonomia";
import type { Movimentacao, Pauta } from "@/lib/types";

export interface PautasFiltro {
  busca?: string;
  prioridade?: string;
  eixo?: string;
  status?: string;
  ativas?: "ativas" | "desativadas" | "todas";
}

function normaliza(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/** Filtros combinam por E lógico — busca em título, eixo, interlocutores e situação atual. */
export function filtrarPautas(pautas: Pauta[], filtro: PautasFiltro): Pauta[] {
  const ativas = filtro.ativas ?? "ativas";
  const busca = filtro.busca ? normaliza(filtro.busca) : null;

  return pautas.filter((pauta) => {
    if (ativas === "ativas" && !pauta.ativo) return false;
    if (ativas === "desativadas" && pauta.ativo) return false;
    if (filtro.prioridade && pauta.prioridade !== filtro.prioridade) return false;
    // Eixo e status filtram pelo valor canônico: funciona com os dados antigos (texto livre) e com os normalizados.
    if (filtro.eixo && eixoMae(pauta.eixo) !== filtro.eixo) return false;
    if (filtro.status && statusCanonico(pauta.status) !== filtro.status) return false;
    if (busca) {
      const alvo = normaliza(
        `${pauta.titulo} ${pauta.eixo} ${pauta.interlocutores} ${pauta.situacaoAtual}`
      );
      if (!alvo.includes(busca)) return false;
    }
    return true;
  });
}

/** Eixos-mãe que têm pautas (na ordem da lista fechada; "Outros eixos" só se algum valor não mapear). */
export function eixosDisponiveis(pautas: Pauta[]): string[] {
  const presentes = new Set(pautas.map((p) => eixoMae(p.eixo)));
  return [...EIXOS_MAE, EIXO_OUTROS].filter((e) => presentes.has(e));
}

export type OrdenacaoPautas = "titulo" | "atualizado" | "prioridade" | "eixo" | "status";

const PESO_PRIORIDADE: Record<Pauta["prioridade"], number> = { Alta: 0, Media: 1, Baixa: 2 };

/** Ordena a lista de pautas para a barra de filtro de /pautas. */
export function ordenarPautas(pautas: Pauta[], ordenacao: OrdenacaoPautas = "titulo"): Pauta[] {
  const lista = [...pautas];
  switch (ordenacao) {
    case "atualizado":
      return lista.sort((a, b) => b.$updatedAt.localeCompare(a.$updatedAt));
    case "prioridade":
      return lista.sort((a, b) => PESO_PRIORIDADE[a.prioridade] - PESO_PRIORIDADE[b.prioridade]);
    case "eixo":
      return lista.sort((a, b) => a.eixo.localeCompare(b.eixo, "pt-BR"));
    case "status":
      return lista.sort(
        (a, b) =>
          STATUS_PAUTA.indexOf(statusCanonico(a.status)) - STATUS_PAUTA.indexOf(statusCanonico(b.status))
      );
    case "titulo":
    default:
      return lista.sort((a, b) => a.titulo.localeCompare(b.titulo, "pt-BR"));
  }
}

export interface MovimentacoesFiltro {
  pautaId?: string;
  eixo?: string;
  origem?: string;
}

/** Eixo não existe na movimentação — resolve via a pauta a que ela pertence. */
export function filtrarMovimentacoes(
  movimentacoes: Movimentacao[],
  pautas: Pauta[],
  filtro: MovimentacoesFiltro
): Movimentacao[] {
  const eixoPorPauta = new Map(pautas.map((p) => [p.$id, eixoMae(p.eixo)]));

  return movimentacoes.filter((mov) => {
    if (filtro.pautaId && mov.pautaId !== filtro.pautaId) return false;
    if (filtro.origem && mov.origem !== filtro.origem) return false;
    if (filtro.eixo && eixoPorPauta.get(mov.pautaId) !== filtro.eixo) return false;
    return true;
  });
}

/** Status canônicos que têm pautas, na ordem do ciclo de vida. */
export function statusDisponiveis(pautas: Pauta[]): string[] {
  const presentes = new Set(pautas.map((p) => statusCanonico(p.status)));
  return STATUS_PAUTA.filter((s) => presentes.has(s));
}

/**
 * A área Tramitação só lista pautas explicitamente marcadas para isso no
 * cadastro (campo "Incluir em Tramitação" — Sim/Não). O controle é manual,
 * feito pelo administrador/coordenador ao criar ou editar a pauta.
 */
export function pautasLegislativas(pautas: Pauta[]): Pauta[] {
  return pautas.filter((p) => p.incluirTramitacao);
}
