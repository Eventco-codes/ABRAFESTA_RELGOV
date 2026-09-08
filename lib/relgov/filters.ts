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
    if (filtro.eixo && pauta.eixo !== filtro.eixo) return false;
    if (filtro.status && pauta.status !== filtro.status) return false;
    if (busca) {
      const alvo = normaliza(
        `${pauta.titulo} ${pauta.eixo} ${pauta.interlocutores} ${pauta.situacaoAtual}`
      );
      if (!alvo.includes(busca)) return false;
    }
    return true;
  });
}

export function eixosDisponiveis(pautas: Pauta[]): string[] {
  return [...new Set(pautas.map((p) => p.eixo))].sort();
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
      return lista.sort((a, b) => a.status.localeCompare(b.status, "pt-BR"));
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
  const eixoPorPauta = new Map(pautas.map((p) => [p.$id, p.eixo]));

  return movimentacoes.filter((mov) => {
    if (filtro.pautaId && mov.pautaId !== filtro.pautaId) return false;
    if (filtro.origem && mov.origem !== filtro.origem) return false;
    if (filtro.eixo && eixoPorPauta.get(mov.pautaId) !== filtro.eixo) return false;
    return true;
  });
}

export function statusDisponiveis(pautas: Pauta[]): string[] {
  return [...new Set(pautas.map((p) => p.status))].sort();
}

/**
 * A área Tramitação só lista pautas explicitamente marcadas para isso no
 * cadastro (campo "Incluir em Tramitação" — Sim/Não). O controle é manual,
 * feito pelo administrador/coordenador ao criar ou editar a pauta.
 */
export function pautasLegislativas(pautas: Pauta[]): Pauta[] {
  return pautas.filter((p) => p.incluirTramitacao);
}
