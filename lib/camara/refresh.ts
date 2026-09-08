import { ID, Query, type TablesDB } from "node-appwrite";

import { APPWRITE_DATABASE_ID, TABLES } from "@/lib/appwrite/constants";
import type { Pauta } from "@/lib/types";

/**
 * Varredura automática real (não o placeholder do README) — só para pautas
 * cujo linkOficial é uma ficha de tramitação da Câmara, cuja API pública tem
 * o status estruturado (dadosabertos.camara.leg.br). ALESP, Senado, DOU e
 * Planalto não têm API equivalente — essas pautas continuam exigindo
 * "+ Registrar movimentação" manual na ficha da pauta.
 */
const CAMARA_LINK_RE = /camara\.leg\.br\/proposicoesWeb\/fichadetramitacao\?idProposicao=(\d+)/;

interface StatusProposicao {
  dataHora?: string;
  siglaOrgao?: string;
  descricaoTramitacao?: string;
  descricaoSituacao?: string;
  despacho?: string;
}

async function fetchStatusProposicao(camaraId: string): Promise<StatusProposicao | null> {
  const res = await fetch(`https://dadosabertos.camara.leg.br/api/v2/proposicoes/${camaraId}`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) return null;
  const json = await res.json();
  return json?.dados?.statusProposicao ?? null;
}

export interface DetalheAtualizacao {
  titulo: string;
  atualizado: boolean;
  motivo?: string;
}

export interface ResultadoAtualizacaoTramitacao {
  verificadas: number;
  atualizadas: number;
  semLinkCamara: number;
  detalhes: DetalheAtualizacao[];
}

/**
 * Para cada pauta com link oficial da Câmara: busca o status atual na API
 * pública e, se houver tramitação mais recente que a última movimentação
 * registrada, atualiza a pauta e cria UMA movimentação (origem
 * VARREDURA_AUTOMATICA) — nunca duplica quando não há novidade.
 */
export async function atualizarTramitacaoViaCamara(
  tablesDB: TablesDB,
  pautas: Pauta[],
  criadoPorNome: string
): Promise<ResultadoAtualizacaoTramitacao> {
  const resultado: ResultadoAtualizacaoTramitacao = {
    verificadas: 0,
    atualizadas: 0,
    semLinkCamara: 0,
    detalhes: [],
  };

  for (const pauta of pautas) {
    const match = pauta.linkOficial ? CAMARA_LINK_RE.exec(pauta.linkOficial) : null;
    if (!match) {
      resultado.semLinkCamara++;
      continue;
    }
    resultado.verificadas++;

    let status: StatusProposicao | null;
    try {
      status = await fetchStatusProposicao(match[1]);
    } catch {
      resultado.detalhes.push({
        titulo: pauta.titulo,
        atualizado: false,
        motivo: "Falha ao consultar a API da Câmara.",
      });
      continue;
    }

    if (!status?.dataHora) {
      resultado.detalhes.push({ titulo: pauta.titulo, atualizado: false, motivo: "Sem status disponível." });
      continue;
    }

    const { rows: ultimasMovs } = await tablesDB.listRows({
      databaseId: APPWRITE_DATABASE_ID,
      tableId: TABLES.movimentacoes,
      queries: [Query.equal("pautaId", pauta.$id), Query.orderDesc("data"), Query.limit(1)],
    });
    const ultimaData = ultimasMovs[0]?.data ? new Date(ultimasMovs[0].data).getTime() : 0;
    const novaData = new Date(status.dataHora).getTime();

    if (!(novaData > ultimaData)) {
      resultado.detalhes.push({
        titulo: pauta.titulo,
        atualizado: false,
        motivo: "Sem novidade desde a última verificação.",
      });
      continue;
    }

    const situacaoAtual =
      [status.descricaoSituacao, status.siglaOrgao ? `(${status.siglaOrgao})` : null]
        .filter(Boolean)
        .join(" ") || pauta.situacaoAtual;
    const descricaoMov =
      status.despacho || status.descricaoTramitacao || status.descricaoSituacao || "Tramitação atualizada.";

    await tablesDB.updateRow({
      databaseId: APPWRITE_DATABASE_ID,
      tableId: TABLES.pautas,
      rowId: pauta.$id,
      data: {
        situacaoAtual,
        status: status.descricaoSituacao ?? pauta.status,
      },
    });

    await tablesDB.createRow({
      databaseId: APPWRITE_DATABASE_ID,
      tableId: TABLES.movimentacoes,
      rowId: ID.unique(),
      data: {
        pautaId: pauta.$id,
        data: status.dataHora,
        origem: "VARREDURA_AUTOMATICA",
        titulo: (status.descricaoTramitacao ?? "Tramitação atualizada").slice(0, 250),
        descricao: descricaoMov.slice(0, 1900),
        criadoPorNome,
      },
    });

    resultado.atualizadas++;
    resultado.detalhes.push({ titulo: pauta.titulo, atualizado: true });
  }

  return resultado;
}
