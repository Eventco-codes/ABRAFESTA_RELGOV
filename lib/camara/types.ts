import type { RelgovRow } from "@/lib/types";

/** Linha da tabela `deputados` (sync Câmara — ver scripts/camara/schema.mjs). */
export interface Deputado extends RelgovRow {
  camaraId: number;
  nome: string | null;
  nomeEleitoral: string | null;
  nomeCivil: string | null;
  siglaPartido: string | null;
  siglaUf: string | null;
  idLegislatura: number | null;
  urlFoto: string | null;
  email: string | null;
  situacao: string | null;
  condicaoEleitoral: string | null;
  sexo: string | null;
  dataNascimento: string | null;
  ufNascimento: string | null;
  escolaridade: string | null;
  gabineteNome: string | null;
  gabineteSala: string | null;
  gabinetePredio: string | null;
  gabineteAndar: string | null;
  gabineteTelefone: string | null;
  gabineteEmail: string | null;
  atualizadoEm: string | null;
}
