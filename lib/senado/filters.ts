import type { Senador } from "@/lib/senado/data";

export interface SenadoresFiltro {
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

export function filtrarSenadores(senadores: Senador[], filtro: SenadoresFiltro): Senador[] {
  const busca = filtro.busca ? normaliza(filtro.busca) : null;

  return senadores.filter((s) => {
    if (filtro.partido && s.partido !== filtro.partido) return false;
    if (filtro.uf && s.uf !== filtro.uf) return false;
    if (busca) {
      const alvo = normaliza(`${s.nome ?? ""} ${s.nomeCompleto ?? ""}`);
      if (!alvo.includes(busca)) return false;
    }
    return true;
  });
}

export function partidosDisponiveis(senadores: Senador[]): string[] {
  return [...new Set(senadores.map((s) => s.partido).filter((v): v is string => Boolean(v)))].sort();
}

export function ufsDisponiveis(senadores: Senador[]): string[] {
  return [...new Set(senadores.map((s) => s.uf).filter((v): v is string => Boolean(v)))].sort();
}
