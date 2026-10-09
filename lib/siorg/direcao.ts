// lib/siorg/direcao.ts
// Busca ao vivo (sem persistir) do Ministro de Estado e do Chefe de Gabinete
// de um ministério, via SIORG. Chamado ao abrir a ficha do ministério.
//
// IMPORTANTE: a API pública /instancias/consulta-unidade devolve `nomeTitular`
// consistentemente null (confirmado em produção, ver lib/siorg/types.ts) — ela
// só confirma QUE o cargo existe e seu código de função, não QUEM o ocupa.
// Nunca lê/persiste `cpfTitular`.

import { siorg } from "./client";
import type { SiorgUnidade } from "./data";

export interface CargoEncontrado {
  denominacao: string;
  funcao: string;
  nomeTitular: string | null;
  unidadeNome: string;
}

export interface DirecaoMinisterio {
  ministro: CargoEncontrado | null;
  chefeGabinete: CargoEncontrado | null;
  erro?: string;
}

const RE_MINISTRO = /^ministro\b/i;
const RE_GABINETE = /gabinete/i;
const RE_CHEFE_GABINETE = /chefe de gabinete/i;

function primeiroCargo(
  cargos: { denominacao: string; funcao: string; instancias: { nomeTitular: string | null }[] }[] | undefined,
  re: RegExp,
  unidadeNome: string
): CargoEncontrado | null {
  const cargo = cargos?.find((c) => re.test(c.denominacao));
  if (!cargo) return null;
  return {
    denominacao: cargo.denominacao,
    funcao: cargo.funcao,
    nomeTitular: cargo.instancias.find((i) => i.nomeTitular)?.nomeTitular ?? null,
    unidadeNome,
  };
}

/** `subordinadas` já carregadas pela página (evita nova consulta ao Appwrite). */
export async function buscarDirecaoMinisterio(
  ministerio: Pick<SiorgUnidade, "$id" | "nome">,
  subordinadas: SiorgUnidade[]
): Promise<DirecaoMinisterio> {
  try {
    const [{ data: unidadeMinisterio }, gabinete] = await Promise.all([
      siorg.instanciasUnidade(ministerio.$id),
      (async () => {
        const sub = subordinadas.find((u) => RE_GABINETE.test(u.nome));
        if (!sub) return null;
        const { data } = await siorg.instanciasUnidade(sub.$id);
        return data;
      })(),
    ]);

    return {
      ministro: primeiroCargo(unidadeMinisterio?.cargos, RE_MINISTRO, ministerio.nome),
      chefeGabinete: gabinete
        ? primeiroCargo(gabinete.cargos, RE_CHEFE_GABINETE, gabinete.nomeUnidade)
        : null,
    };
  } catch (err) {
    return {
      ministro: null,
      chefeGabinete: null,
      erro: err instanceof Error ? err.message : "Falha ao consultar o SIORG.",
    };
  }
}
