import type { Deputado } from "@/lib/camara/types";
import type { Pauta } from "@/lib/types";

export interface DeputadosFiltro {
  busca?: string;
  partido?: string;
  uf?: string;
}

function normaliza(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/** Extrai o nome de um "autor" de pauta no formato "Dep. Nome (Partido/UF)" ou "Dep. Nome". */
function extrairNomeAutor(autor: string): string {
  return autor
    .replace(/^dep\.?\s+/i, "")
    .replace(/\s*\([^)]*\)/g, "")
    .trim();
}

/**
 * IDs dos deputados citados como "Autor" em alguma pauta legislativa (as que
 * aparecem em Tramitação) — usado para sinalizar 🔘 na página Deputados. O
 * campo `autor` da pauta é texto livre (ex.: "Dep. Bibo Nunes (PL/RS)"), daí a
 * comparação por nome normalizado (sem acento/caixa) em vez de um ID.
 *
 * `autor` não segue um formato fixo (é um campo de texto livre no cadastro da
 * pauta — ver app/(painel)/pautas/pauta-form.tsx): o match aqui é só exato
 * (após extrair "Dep." e parênteses) de propósito — uma tentativa de match
 * "por conteúdo" (nome aparece em algum lugar do texto) foi testada e
 * descartada por gerar falso positivo real (ex.: um deputado de sobrenome
 * "Marcon" batendo com o autor "Dep. Mauricio Marcon (PODE/RS)", que é outra
 * pessoa) — prefira um falso negativo silencioso a um 🔘 errado.
 */
export function idsDeputadosAutoresEmTramitacao(
  deputados: Deputado[],
  pautasLegislativas: Pauta[]
): Set<string> {
  const autoresExatos = new Set(
    pautasLegislativas
      .map((p) => p.autor)
      .filter((a): a is string => Boolean(a && a.trim()))
      .map((a) => normaliza(extrairNomeAutor(a)))
  );

  const ids = new Set<string>();
  for (const dep of deputados) {
    const candidatos = [dep.nome, dep.nomeEleitoral, dep.nomeCivil]
      .filter((n): n is string => Boolean(n))
      .map(normaliza);
    if (candidatos.some((c) => autoresExatos.has(c))) {
      ids.add(dep.$id);
    }
  }
  return ids;
}

export function filtrarDeputados(deputados: Deputado[], filtro: DeputadosFiltro): Deputado[] {
  const busca = filtro.busca ? normaliza(filtro.busca) : null;

  return deputados.filter((dep) => {
    if (filtro.partido && dep.siglaPartido !== filtro.partido) return false;
    if (filtro.uf && dep.siglaUf !== filtro.uf) return false;
    if (busca) {
      const alvo = normaliza(`${dep.nome ?? ""} ${dep.nomeCivil ?? ""}`);
      if (!alvo.includes(busca)) return false;
    }
    return true;
  });
}

export function partidosDisponiveis(deputados: Deputado[]): string[] {
  return [...new Set(deputados.map((d) => d.siglaPartido).filter((v): v is string => Boolean(v)))].sort();
}

export function ufsDisponiveis(deputados: Deputado[]): string[] {
  return [...new Set(deputados.map((d) => d.siglaUf).filter((v): v is string => Boolean(v)))].sort();
}
