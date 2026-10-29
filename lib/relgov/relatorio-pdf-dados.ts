import type { TablesDB } from "node-appwrite";

import { listEncaminhamentosDePautas, listPautas, listPendencias } from "@/lib/relgov/data";
import { pautasAtivas } from "@/lib/relgov/derived";

/**
 * Dados do relatório em PDF. Usado pela rota do usuário (cliente com a sessão dele) e pela
 * geração agendada (cliente admin): as duas precisam chegar ao MESMO conteúdo, porque o cache do
 * PDF é por conteúdo — o agendado só serve ao usuário se os dados forem idênticos.
 */
export async function carregarDadosRelatorio(tablesDB: TablesDB, apenasAlta: boolean) {
  const [todasPautas, pendencias] = await Promise.all([listPautas(tablesDB), listPendencias(tablesDB)]);
  const ativas = pautasAtivas(todasPautas);
  const pautas = apenasAlta ? ativas.filter((p) => p.prioridade === "Alta") : ativas;
  const encaminhamentos = await listEncaminhamentosDePautas(
    tablesDB,
    pautas.map((p) => p.$id)
  );
  return { pautas, encaminhamentos, pendencias };
}
