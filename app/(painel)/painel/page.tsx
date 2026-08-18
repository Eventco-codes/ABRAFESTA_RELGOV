import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import { PageHeader } from "@/components/relgov/page-header";
import { requireSession } from "@/lib/auth";
import { canRodarMonitoramento } from "@/lib/permissions";
import {
  getResumoSemanalPorSemana,
  listMovimentacoesRecentes,
  listPautas,
  listPendencias,
} from "@/lib/relgov/data";
import {
  distribuicaoPorEixo,
  pautasAtivas,
  pautasPrioridadeAlta,
  pendenciasAbertas,
  pendenciasVencidas,
  proximaSegundaAs6h,
  semanaCorrente,
} from "@/lib/relgov/derived";
import { gerarResumoAutomatico, movimentacoesUltimos7Dias } from "@/lib/relgov/resumo";
import { IndicadoresTab } from "./indicadores-tab";
import { PainelTabs, PainelTopbarActions } from "./painel-client";
import { ResumoTab } from "./resumo-tab";

export default async function PainelPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const { user, tablesDB } = await requireSession();

  const prefTab = (user.prefs as Record<string, unknown>)?.ultimaAbaPainel;
  const activeTab: "resumo" | "indicadores" =
    tab === "indicadores" || tab === "resumo"
      ? tab
      : prefTab === "indicadores"
        ? "indicadores"
        : "resumo";

  const { inicio, numeroSemana } = semanaCorrente();
  const [pautas, pendencias, movimentacoes, resumo] = await Promise.all([
    listPautas(tablesDB),
    listPendencias(tablesDB),
    listMovimentacoesRecentes(tablesDB),
    getResumoSemanalPorSemana(tablesDB, inicio),
  ]);

  const recentes = movimentacoesUltimos7Dias(movimentacoes);
  const { pautasComMovimentacao } = gerarResumoAutomatico(pautas, pendencias, recentes);
  const abertas = pendenciasAbertas(pendencias);
  const vencidas = pendenciasVencidas(pendencias);
  const ativas = pautasAtivas(pautas);
  const prioridadeAlta = pautasPrioridadeAlta(pautas);

  const cobrarEstaSemana = [...vencidas]
    .sort((a, b) => a.prazoSugerido.localeCompare(b.prazoSugerido))
    .slice(0, 3);

  const hoje = format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR });
  const subtitulo = resumo
    ? `${capitalize(hoje)} · última varredura em ${format(new Date(resumo.$createdAt), "dd/MM 'às' HH:mm")}`
    : `${capitalize(hoje)} · monitoramento ainda não rodou nesta semana`;

  return (
    <div>
      <PageHeader
        title="Painel de acompanhamento"
        subtitle={subtitulo}
        actions={<PainelTopbarActions canManage={canRodarMonitoramento(user.role)} />}
        tabs={<PainelTabs active={activeTab} />}
      />

      {activeTab === "resumo" ? (
        <ResumoTab
          resumo={resumo}
          pautasComMovimentacao={pautasComMovimentacao}
          numeroSemana={numeroSemana}
          numeros={{
            pautasAtivas: ativas.length,
            comMovimentacao: pautasComMovimentacao.length,
            pendenciasAbertas: abertas.length,
            prazosVencidos: vencidas.length,
          }}
          cobrarEstaSemana={cobrarEstaSemana}
          canManage={canRodarMonitoramento(user.role)}
        />
      ) : (
        <IndicadoresTab
          kpis={{
            pautasAtivas: ativas.length,
            pautasNovas2026: ativas.filter((p) => p.$createdAt.startsWith("2026")).length,
            prioridadeAlta: prioridadeAlta.length,
            percentualAlta: ativas.length
              ? Math.round((prioridadeAlta.length / ativas.length) * 100)
              : 0,
            pendenciasAbertas: abertas.length,
            pendenciasExternas: abertas.filter((p) =>
              p.status.toLowerCase().includes("externa")
            ).length,
            pendenciasInternas: abertas.filter(
              (p) => !p.status.toLowerCase().includes("externa")
            ).length,
            prazosVencidos: vencidas.length,
          }}
          distribuicaoEixo={distribuicaoPorEixo(pautas)}
          cobrancasSugeridas={[...abertas]
            .sort((a, b) => a.prazoSugerido.localeCompare(b.prazoSugerido))
            .slice(0, 5)}
          proximaExecucao={proximaSegundaAs6h()}
        />
      )}
    </div>
  );
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
