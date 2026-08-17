import { parseISO } from "date-fns";

import type { Movimentacao, Pauta, Pendencia } from "@/lib/types";
import { pendenciasVencidas } from "@/lib/relgov/derived";

export interface ResumoAutomatico {
  manchete: string;
  lide: string;
  pautasComMovimentacao: Pauta[];
}

/**
 * Gera manchete/lide por template a partir dos dados reais da semana —
 * não é geração por IA nem faz scraping dos links oficiais (ver README:
 * "Ponto em aberto — varredura automática"). Serve de rascunho inicial;
 * Administrador/Coordenador podem reescrever antes de enviar.
 */
export function gerarResumoAutomatico(
  pautas: Pauta[],
  pendencias: Pendencia[],
  movimentacoesUltimos7Dias: Movimentacao[]
): ResumoAutomatico {
  const pautaIdsComMovimentacao = [
    ...new Set(movimentacoesUltimos7Dias.map((m) => m.pautaId)),
  ];
  const pautasComMovimentacao = pautas.filter((p) =>
    pautaIdsComMovimentacao.includes(p.$id)
  );
  const vencidas = pendenciasVencidas(pendencias);

  const frentes = pautasComMovimentacao.length;
  const cobrancas = vencidas.length;

  const manchete =
    frentes === 0 && cobrancas === 0
      ? "Semana sem movimentações registradas e sem cobranças em atraso"
      : `${frentes} ${frentes === 1 ? "frente avançou" : "frentes avançaram"} e ${cobrancas} ${
          cobrancas === 1 ? "cobrança está" : "cobranças estão"
        } em atraso`;

  const nomesPautas = pautasComMovimentacao
    .slice(0, 3)
    .map((p) => p.titulo)
    .join(", ");

  const lide =
    frentes > 0
      ? `A varredura desta semana encontrou movimentação registrada em ${nomesPautas}${
          frentes > 3 ? " e outras pautas" : ""
        }. Consulte a coluna de pendências para as cobranças em atraso.`
      : "Nenhuma movimentação foi registrada manualmente nesta semana. Consulte a lista de pautas para o panorama completo.";

  return { manchete, lide, pautasComMovimentacao };
}

export function movimentacoesUltimos7Dias(movimentacoes: Movimentacao[]): Movimentacao[] {
  const limite = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return movimentacoes.filter((m) => parseISO(m.data).getTime() >= limite);
}
