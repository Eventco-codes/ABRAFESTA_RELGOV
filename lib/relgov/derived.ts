import { differenceInCalendarDays, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

import type { Pauta, Pendencia } from "@/lib/types";

export function isVencido(pendencia: Pick<Pendencia, "prazoSugerido" | "status">) {
  if (pendencia.status.toLowerCase().includes("conclu")) return false;
  return parseISO(pendencia.prazoSugerido).getTime() < Date.now();
}

export function diasAtraso(prazoSugerido: string): number {
  const dias = differenceInCalendarDays(new Date(), parseISO(prazoSugerido));
  return Math.max(dias, 0);
}

export function formatDateBR(iso: string): string {
  return format(parseISO(iso), "dd/MM/yyyy", { locale: ptBR });
}

export function formatDateLongBR(iso: string): string {
  return format(parseISO(iso), "d 'de' MMMM 'de' yyyy", { locale: ptBR });
}

export function pautasAtivas(pautas: Pauta[]) {
  return pautas.filter((p) => p.ativo);
}

export function pautasPrioridadeAlta(pautas: Pauta[]) {
  return pautasAtivas(pautas).filter((p) => p.prioridade === "Alta");
}

export function pendenciasAbertas(pendencias: Pendencia[]) {
  return pendencias.filter((p) => !p.status.toLowerCase().includes("conclu"));
}

export function pendenciasVencidas(pendencias: Pendencia[]) {
  return pendenciasAbertas(pendencias).filter((p) => isVencido(p));
}

/**
 * Agrupa por eixo temático (o campo "eixo" das pautas vem detalhado,
 * ex: "Trabalhista / plataformas" — aqui agrupa pela parte antes da "/"),
 * mantém os 5 maiores e soma o resto em "Outros eixos".
 */
export function distribuicaoPorEixo(pautas: Pauta[]) {
  const ativas = pautasAtivas(pautas);
  const counts = new Map<string, number>();
  for (const pauta of ativas) {
    const bucket = pauta.eixo.split("/")[0].trim();
    counts.set(bucket, (counts.get(bucket) ?? 0) + 1);
  }

  const ordenado = [...counts.entries()]
    .map(([eixo, total]) => ({ eixo, total }))
    .sort((a, b) => b.total - a.total);

  const TOP_N = 5;
  if (ordenado.length <= TOP_N) return ordenado;

  const principais = ordenado.slice(0, TOP_N);
  const outros = ordenado.slice(TOP_N).reduce((acc, item) => acc + item.total, 0);
  return [...principais, { eixo: "Outros eixos", total: outros }];
}

/** Início (segunda) e fim (domingo) da semana ISO corrente, em ISO date (yyyy-MM-dd). */
export function semanaCorrente(referencia = new Date()) {
  const dia = referencia.getDay();
  const offsetSegunda = dia === 0 ? -6 : 1 - dia;
  const inicio = new Date(referencia);
  inicio.setDate(referencia.getDate() + offsetSegunda);
  inicio.setHours(0, 0, 0, 0);
  const fim = new Date(inicio);
  fim.setDate(inicio.getDate() + 6);
  return {
    inicio: format(inicio, "yyyy-MM-dd"),
    fim: format(fim, "yyyy-MM-dd"),
    numeroSemana: getIsoWeek(inicio),
  };
}

function getIsoWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/** Próxima segunda-feira às 06:00, formatada "dd/MM · 06:00" (bloco de automação, 2b). */
export function proximaSegundaAs6h(referencia = new Date()): string {
  const dia = referencia.getDay();
  const diasAteSegunda = dia === 1 ? 7 : ((8 - dia) % 7 || 7);
  const proxima = new Date(referencia);
  proxima.setDate(referencia.getDate() + diasAteSegunda);
  return `${format(proxima, "dd/MM")} · 06:00`;
}
