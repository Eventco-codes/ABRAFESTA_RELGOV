import type { Movimentacao } from "@/lib/types";

/**
 * Rótulo exibido de uma movimentação na Tramitação.
 *
 * A carga inicial gravou títulos genéricos repetidos em pautas diferentes (30× "Atualização out/2026
 * (planilha RelGov)", 5× "Pauta incluída no monitoramento"…), o que fazia a linha do tempo parecer
 * cheia de eventos idênticos. Aqui só a EXIBIÇÃO muda: os genéricos ganham um resumo do que o evento
 * diz de fato. Nada é regravado, e títulos escritos por pessoas passam sem alteração.
 */

const RESUMO_MAX = 90;

/** Primeiros ~90 caracteres da descrição, cortados em limite de palavra. */
function resumir(texto: string): string {
  const limpo = texto.replace(/\s+/g, " ").trim();
  if (limpo.length <= RESUMO_MAX) return limpo;
  const corte = limpo.lastIndexOf(" ", RESUMO_MAX);
  return `${limpo.slice(0, corte > 40 ? corte : RESUMO_MAX).replace(/[,;:\s]+$/, "")}…`;
}

export interface RotuloMovimentacao {
  titulo: string;
  /** false quando o texto da descrição já está inteiro no rótulo (evita repetir). */
  mostrarDescricao: boolean;
}

export function rotuloMovimentacao(mov: Pick<Movimentacao, "titulo" | "descricao">): RotuloMovimentacao {
  const titulo = mov.titulo.trim();
  const descricao = (mov.descricao ?? "").trim();

  // "Atualização out/2026 (planilha RelGov)" → "Atualização da planilha RelGov (out/2026): <resumo>"
  const planilha = /^atualiza[çc][ãa]o\s+([a-zç]{3}\/\d{4})\s*\(planilha relgov\)$/i.exec(titulo);
  if (planilha) {
    const base = `Atualização da planilha RelGov (${planilha[1]})`;
    if (!descricao) return { titulo: base, mostrarDescricao: false };
    const resumo = resumir(descricao);
    return { titulo: `${base}: ${resumo}`, mostrarDescricao: resumo !== descricao };
  }

  // "Pauta incluída no monitoramento" + "… Fonte: Câmara dos Deputados — …" → "(Câmara dos Deputados)"
  if (/^pauta inclu[ií]da no monitoramento$/i.test(titulo)) {
    const fonte = /fonte:\s*([^—–]+?)\s*[—–]/i.exec(descricao)?.[1];
    return { titulo: fonte ? `Pauta incluída no monitoramento · ${fonte}` : titulo, mostrarDescricao: true };
  }

  return { titulo, mostrarDescricao: true };
}
