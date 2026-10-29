import type { SiorgUnidade } from "@/lib/siorg/data";

/** "Ministério" é uma convenção de nomenclatura do governo federal — não existe
 * uma categoria/tipo dedicado no SIORG que isole só os ministérios. */
export function isMinisterio(unidade: Pick<SiorgUnidade, "nome">): boolean {
  const nome = unidade.nome.trim();
  // "Ministério Público …" (MPF, MPDFT, MPT…) é órgão de Estado, não ministério do Executivo.
  return /^minist[ée]rio\b/i.test(nome) && !/^minist[ée]rio\s+p[úu]blico\b/i.test(nome);
}

export function filtrarMinisterios(unidades: SiorgUnidade[]): SiorgUnidade[] {
  return unidades.filter(isMinisterio);
}
