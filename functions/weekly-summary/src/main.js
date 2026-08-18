import { Client, TablesDB, Query, ID } from "node-appwrite";

/**
 * Appwrite Function agendada (schedule sugerido: "0 6 * * 1", toda segunda 06:00 —
 * ajustar fuso ao configurar no Console).
 *
 * Garante que existe um resumo semanal (resumos_semanais) para a semana
 * corrente, com manchete/lide gerados por template a partir dos dados reais
 * — mesma lógica do botão "Rodar monitoramento" do app (app/(painel)/painel/actions.ts).
 * Não envia e-mail nem faz scraping dos links oficiais (MVP — ver README).
 *
 * Variáveis de ambiente esperadas (configurar em Function → Settings → Variables):
 *   APPWRITE_ENDPOINT (opcional, default http://appwrite/v1 — rede interna do self-hosted)
 *   APPWRITE_DATABASE_ID (default "relgov")
 */
async function weeklySummary({ req, res, log, error }) {
  const endpoint = process.env.APPWRITE_ENDPOINT || "http://appwrite/v1";
  const databaseId = process.env.APPWRITE_DATABASE_ID || "relgov";

  const client = new Client()
    .setEndpoint(endpoint)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(req.headers["x-appwrite-key"] || "");

  const tablesDB = new TablesDB(client);

  try {
    const { inicio, fim } = semanaCorrente();

    const { rows: existentes } = await tablesDB.listRows({
      databaseId,
      tableId: "resumos_semanais",
      queries: [Query.equal("semanaInicio", inicio), Query.limit(1)],
    });

    if (existentes.length > 0) {
      log(`Resumo da semana ${inicio} já existe (${existentes[0].$id}). Nada a fazer.`);
      return res.json({ ok: true, criado: false, resumoId: existentes[0].$id });
    }

    const [{ rows: pautas }, { rows: pendencias }, { rows: movimentacoes }] = await Promise.all([
      tablesDB.listRows({ databaseId, tableId: "pautas", queries: [Query.limit(200)] }),
      tablesDB.listRows({ databaseId, tableId: "pendencias", queries: [Query.limit(200)] }),
      tablesDB.listRows({
        databaseId,
        tableId: "movimentacoes",
        queries: [Query.orderDesc("data"), Query.limit(60)],
      }),
    ]);

    const limite = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentes = movimentacoes.filter((m) => new Date(m.data).getTime() >= limite);
    const pautaIdsComMovimentacao = [...new Set(recentes.map((m) => m.pautaId))];
    const frentes = pautaIdsComMovimentacao.length;

    const vencidas = pendencias.filter(
      (p) =>
        !p.status.toLowerCase().includes("conclu") &&
        new Date(p.prazoSugerido).getTime() < Date.now()
    ).length;

    const manchete =
      frentes === 0 && vencidas === 0
        ? "Semana sem movimentações registradas e sem cobranças em atraso"
        : `${frentes} ${frentes === 1 ? "frente avançou" : "frentes avançaram"} e ${vencidas} ${
            vencidas === 1 ? "cobrança está" : "cobranças estão"
          } em atraso`;

    const nomes = pautas
      .filter((p) => pautaIdsComMovimentacao.includes(p.$id))
      .slice(0, 3)
      .map((p) => p.titulo)
      .join(", ");
    const lide =
      frentes > 0
        ? `A varredura desta semana encontrou movimentação registrada em ${nomes}${frentes > 3 ? " e outras pautas" : ""}.`
        : "Nenhuma movimentação foi registrada manualmente nesta semana.";

    const resumo = await tablesDB.createRow({
      databaseId,
      tableId: "resumos_semanais",
      rowId: ID.unique(),
      data: { semanaInicio: inicio, semanaFim: fim, manchete, lide },
    });

    log(`Resumo da semana ${inicio} criado (${resumo.$id}).`);
    return res.json({ ok: true, criado: true, resumoId: resumo.$id });
  } catch (err) {
    error(err?.message ?? String(err));
    return res.json({ ok: false, erro: err?.message ?? String(err) }, 500);
  }
}

export default weeklySummary;

function semanaCorrente(referencia = new Date()) {
  const dia = referencia.getDay();
  const offsetSegunda = dia === 0 ? -6 : 1 - dia;
  const inicio = new Date(referencia);
  inicio.setDate(referencia.getDate() + offsetSegunda);
  inicio.setHours(0, 0, 0, 0);
  const fim = new Date(inicio);
  fim.setDate(inicio.getDate() + 6);
  return { inicio: toIsoDate(inicio), fim: toIsoDate(fim) };
}

function toIsoDate(date) {
  return date.toISOString().slice(0, 10);
}
