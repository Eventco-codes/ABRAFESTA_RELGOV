import type { SiorgUnidade } from "@/lib/siorg/data";

/** "Ministério" é uma convenção de nomenclatura do governo federal — não existe
 * uma categoria/tipo dedicado no SIORG que isole só os ministérios. */
export function isMinisterio(unidade: Pick<SiorgUnidade, "nome">): boolean {
  return /^minist[ée]rio\b/i.test(unidade.nome.trim());
}

export function filtrarMinisterios(unidades: SiorgUnidade[]): SiorgUnidade[] {
  return unidades.filter(isMinisterio);
}
