/* eslint-disable jsx-a11y/alt-text -- <Image> do @react-pdf/renderer não é <img> HTML (não tem prop alt) */
import fs from "node:fs";
import path from "node:path";
import {
  Document,
  Font,
  Image,
  Link,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";

import type { Encaminhamento, Pauta, Pendencia } from "@/lib/types";

/**
 * Relatório de acompanhamento legislativo em PDF "de verdade" (gerado no
 * servidor): fontes da marca embutidas, cores e logo ABRAFESTA, capa,
 * sumário com paginação, cabeçalho/rodapé com "Página X de Y" e anexo de
 * pendências. Substitui o window.print(), que dependia do navegador
 * imprimir os fundos (a capa saía com texto branco sobre branco).
 */

const ASSETS = path.join(process.cwd(), "lib/relgov/pdf-assets");
const LOGO = path.join(process.cwd(), "public/abrafesta-logo.png");

let fontesRegistradas = false;
function registrarFontes() {
  if (fontesRegistradas) return;
  const f = (nome: string) => path.join(ASSETS, nome);
  Font.register({
    family: "Newsreader",
    fonts: [
      { src: f("newsreader-latin-400-normal.ttf"), fontWeight: 400 },
      { src: f("newsreader-latin-600-normal.ttf"), fontWeight: 600 },
      { src: f("newsreader-latin-400-italic.ttf"), fontWeight: 400, fontStyle: "italic" },
    ],
  });
  Font.register({
    family: "IBMPlexSans",
    fonts: [
      { src: f("ibm-plex-sans-latin-400-normal.ttf"), fontWeight: 400 },
      { src: f("ibm-plex-sans-latin-600-normal.ttf"), fontWeight: 600 },
    ],
  });
  Font.register({
    family: "IBMPlexMono",
    fonts: [{ src: f("ibm-plex-mono-latin-500-normal.ttf"), fontWeight: 500 }],
  });
  Font.registerHyphenationCallback((palavra) => [palavra]);
  fontesRegistradas = true;
}

const COR = {
  navy: "#16233d",
  navyLight: "#22335a",
  gold: "#c8992f",
  bg: "#f7f5f0",
  borda: "#e3e0d8",
  corpo: "#1e232b",
  denso: "#2b3140",
  secundario: "#4a5160",
  mudo: "#6f7480",
  rotulo: "#8b93a5",
  danger: "#b3382c",
  warning: "#b8791a",
  success: "#1c6b45",
  azulTagBg: "#eef1f7",
  azulTagTexto: "#41506e",
};

const s = StyleSheet.create({
  pagina: { fontFamily: "IBMPlexSans", fontSize: 9.5, color: COR.corpo, paddingTop: 74, paddingBottom: 56, paddingHorizontal: 44 },
  capa: { backgroundColor: COR.navy, color: "#ffffff", fontFamily: "IBMPlexSans", padding: 0 },
  cabecalho: { position: "absolute", top: 0, left: 0, right: 0, height: 46, backgroundColor: COR.navy, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 44 },
  cabecalhoFaixa: { position: "absolute", top: 46, left: 0, right: 0, height: 2.5, backgroundColor: COR.gold },
  rodape: { position: "absolute", bottom: 22, left: 44, right: 44, flexDirection: "row", justifyContent: "space-between", borderTopWidth: 0.6, borderTopColor: COR.gold, paddingTop: 6 },
  rodapeTexto: { fontSize: 7.5, color: COR.mudo },
  mono: { fontFamily: "IBMPlexMono", fontWeight: 500, letterSpacing: 1.2, textTransform: "uppercase", lineHeight: 1.3 },
  h1: { fontFamily: "Newsreader", fontWeight: 600, fontSize: 20, lineHeight: 1.25, color: COR.navy, marginBottom: 4, marginTop: 2 },
  filete: { height: 2.5, width: 44, backgroundColor: COR.gold, marginBottom: 14 },
  kpiLinha: { flexDirection: "row", marginBottom: 18 },
  kpi: { flexGrow: 1, flexBasis: 0, borderWidth: 0.8, borderColor: COR.borda, borderTopWidth: 2.5, borderTopColor: COR.gold, backgroundColor: "#ffffff", paddingVertical: 8, paddingHorizontal: 10, marginRight: 8 },
  kpiNumero: { fontFamily: "Newsreader", fontWeight: 600, fontSize: 22, lineHeight: 1.15, color: COR.navy },
  kpiRotulo: { fontSize: 7.5, lineHeight: 1.3, color: COR.mudo, marginTop: 2 },
  eixoSumario: { fontFamily: "IBMPlexMono", fontWeight: 500, fontSize: 7.5, letterSpacing: 1.2, textTransform: "uppercase", lineHeight: 1.3, color: COR.gold, marginTop: 10, marginBottom: 4 },
  itemSumario: { flexDirection: "row", alignItems: "flex-end", marginBottom: 3.5, minHeight: 12 },
  pautaBloco: { marginTop: 14, paddingTop: 10, borderTopWidth: 0.8, borderTopColor: COR.borda },
  pautaEixo: { fontFamily: "IBMPlexMono", fontWeight: 500, fontSize: 7.5, letterSpacing: 1.2, textTransform: "uppercase", lineHeight: 1.3, color: COR.gold },
  pautaTitulo: { fontFamily: "Newsreader", fontWeight: 600, fontSize: 14.5, color: COR.navy, lineHeight: 1.25, marginTop: 2 },
  chips: { flexDirection: "row", marginTop: 6, marginBottom: 2 },
  chip: { fontSize: 7.5, lineHeight: 1.25, paddingVertical: 2, paddingHorizontal: 6, borderRadius: 8, marginRight: 5 },
  secao: { marginTop: 7 },
  secaoTitulo: { fontFamily: "IBMPlexSans", fontWeight: 600, fontSize: 8.5, lineHeight: 1.3, color: COR.navy, marginBottom: 1.5 },
  texto: { fontSize: 9.2, lineHeight: 1.42, color: COR.denso },
  encaminhamento: { flexDirection: "row", marginBottom: 2 },
  caixa: { width: 7, height: 7, borderWidth: 0.8, borderColor: COR.navyLight, marginRight: 6, marginTop: 2.5 },
  fonte: { fontSize: 7.8, color: COR.rotulo, marginTop: 7, fontFamily: "Newsreader", fontStyle: "italic" },
  tabelaCab: { flexDirection: "row", backgroundColor: COR.navy, paddingVertical: 5, paddingHorizontal: 6 },
  tabelaCabTexto: { fontFamily: "IBMPlexMono", fontWeight: 500, fontSize: 6.8, letterSpacing: 0.8, textTransform: "uppercase", lineHeight: 1.3, color: "#ffffff" },
  tabelaLinha: { flexDirection: "row", paddingVertical: 4, paddingHorizontal: 6, borderBottomWidth: 0.6, borderBottomColor: COR.borda },
  celula: { fontSize: 8.2, lineHeight: 1.35, color: COR.denso, paddingRight: 6 },
});

type Dados = {
  pautas: Pauta[];
  encaminhamentos: Encaminhamento[];
  pendencias: Pendencia[];
  geradoEm: Date;
  apenasAlta: boolean;
  emitidoPor: string;
};

const TZ = "America/Sao_Paulo";
const fmtData = (d: Date) => new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, day: "numeric", month: "long", year: "numeric" }).format(d);
const fmtHora = (d: Date) => new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(d);
const fmtDataCurta = (iso: string) => {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
};
const prioridadeLabel = (p: string) => (p === "Media" ? "Média" : p);
const prioridadePeso: Record<string, number> = { Alta: 0, Media: 1, Baixa: 2 };

/** Troca símbolos que as fontes (subconjunto latino) não desenham, para nunca sair caractere quebrado. */
function limpar(t: string | null | undefined): string {
  return (t ?? "")
    .replace(/[→⇒➜➔]/g, "›")
    .replace(/[←]/g, "‹")
    .replace(/[↗↑]/g, "")
    .replace(/[≥]/g, ">=")
    .replace(/[≤]/g, "<=")
    .replace(/[✓✔]/g, "")
    .replace(/ /g, " ")
    .replace(/[​-‍﻿]/g, "")
    .replace(/\s+\n/g, "\n")
    .trim();
}

function estiloPrioridade(p: string) {
  if (p === "Alta") return { backgroundColor: COR.danger, color: "#ffffff" };
  if (p === "Media") return { backgroundColor: COR.warning, color: "#ffffff" };
  return { backgroundColor: COR.rotulo, color: "#ffffff" };
}

function ehVencida(p: Pendencia, hoje: Date) {
  return new Date(`${p.prazoSugerido}T23:59:59-03:00`).getTime() < hoje.getTime();
}

function Secao({ titulo, children }: { titulo: string; children: string | undefined | null }) {
  const texto = limpar(children);
  if (!texto || texto === "—") return null;
  return (
    <View style={s.secao}>
      <Text style={s.secaoTitulo}>{titulo}</Text>
      <Text style={s.texto}>{texto}</Text>
    </View>
  );
}

function Relatorio({ dados, paginas, referencia }: { dados: Dados; paginas: Map<string, number>; referencia: string }) {
  const { pautas, encaminhamentos, pendencias, geradoEm } = dados;

  const grupos = new Map<string, Pauta[]>();
  for (const p of [...pautas].sort(
    (a, b) => prioridadePeso[a.prioridade] - prioridadePeso[b.prioridade] || a.eixo.localeCompare(b.eixo, "pt-BR") || a.titulo.localeCompare(b.titulo, "pt-BR")
  )) {
    const chave = `Prioridade ${prioridadeLabel(p.prioridade).toLowerCase()}`;
    const lista = grupos.get(chave) ?? [];
    lista.push(p);
    grupos.set(chave, lista);
  }
  const ordenadas = [...grupos.values()].flat();
  const numero = new Map(ordenadas.map((p, i) => [p.$id, i + 1]));

  const abertas = pendencias.filter((p) => !p.status.toLowerCase().includes("conclu"));
  const vencidas = abertas.filter((p) => ehVencida(p, geradoEm));
  const abertasOrdenadas = [...abertas].sort((a, b) => a.prazoSugerido.localeCompare(b.prazoSugerido));
  const logo = fs.readFileSync(LOGO);
  const escopo = dados.apenasAlta ? "Escopo: pautas ativas de prioridade alta" : "Escopo: todas as pautas ativas";

  return (
    <Document
      title="Relatório de acompanhamento legislativo — RelGov ABRAFESTA"
      author="ABRAFESTA — Núcleo RelGov"
      subject="Relações Governamentais"
      creator="RelGov ABRAFESTA"
      producer="RelGov ABRAFESTA"
      language="pt-BR"
    >
      {/* CAPA */}
      <Page size="A4" style={s.capa}>
        <View style={{ paddingTop: 70, paddingHorizontal: 56 }}>
          <Image src={{ data: logo, format: "png" }} style={{ width: 190 }} />
          <Text style={[s.mono, { fontSize: 8.5, color: "#ffffff", opacity: 0.65, marginTop: 10 }]}>Relações Governamentais</Text>
        </View>
        <View style={{ paddingHorizontal: 56, marginTop: 190 }}>
          <View style={{ height: 3, width: 60, backgroundColor: COR.gold, marginBottom: 18 }} />
          <Text style={{ fontFamily: "Newsreader", fontWeight: 600, fontSize: 34, lineHeight: 1.18, color: "#ffffff" }}>
            Relatório de acompanhamento legislativo
          </Text>
          <Text style={{ fontFamily: "Newsreader", fontStyle: "italic", fontSize: 14, color: "#ffffff", opacity: 0.75, marginTop: 12 }}>
            Programa Estratégico de Representação Setorial — Núcleo RelGov
          </Text>
        </View>
        <View style={{ position: "absolute", left: 56, right: 56, bottom: 64 }}>
          <View style={{ height: 0.8, backgroundColor: COR.gold, marginBottom: 12 }} />
          {[
            ["Documento", referencia],
            ["Data de emissão", `${fmtData(geradoEm)}, às ${fmtHora(geradoEm)} (Brasília)`],
            ["Abrangência", `${pautas.length} ${pautas.length === 1 ? "pauta" : "pautas"} · ${abertas.length} pendências em aberto`],
            ["Emitido por", dados.emitidoPor],
          ].map(([k, v]) => (
            <View key={k} style={{ flexDirection: "row", marginBottom: 4 }}>
              <Text style={[s.mono, { width: 100, fontSize: 7, color: COR.gold }]}>{k}</Text>
              <Text style={{ fontSize: 9, color: "#ffffff", flex: 1 }}>{v}</Text>
            </View>
          ))}
          <Text style={{ fontSize: 7.5, color: "#ffffff", opacity: 0.6, marginTop: 10 }}>
            Documento de uso interno e confidencial, destinado à diretoria e aos associados da ABRAFESTA — Associação Brasileira de Eventos.
          </Text>
        </View>
      </Page>

      {/* SÍNTESE + SUMÁRIO + CORPO */}
      <Page size="A4" style={s.pagina}>
        <View fixed style={s.cabecalho}>
          <Image src={{ data: logo, format: "png" }} style={{ width: 92 }} />
          <Text style={[s.mono, { fontSize: 6.5, color: "#ffffff", opacity: 0.8 }]}>Relatório de acompanhamento legislativo · {referencia}</Text>
        </View>
        <View fixed style={s.cabecalhoFaixa} />
        <View fixed style={s.rodape}>
          <Text style={s.rodapeTexto}>ABRAFESTA — Associação Brasileira de Eventos · Núcleo RelGov · Uso interno e confidencial</Text>
          <Text style={s.rodapeTexto} render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
        </View>

        <Text style={[s.mono, { fontSize: 7.5, color: COR.gold }]}>Síntese</Text>
        <Text style={s.h1}>Panorama do período</Text>
        <View style={s.filete} />
        <View style={s.kpiLinha}>
          {[
            [String(pautas.length), "Pautas acompanhadas"],
            [String(pautas.filter((p) => p.prioridade === "Alta").length), "Prioridade alta"],
            [String(abertas.length), "Pendências abertas"],
            [String(vencidas.length), "Prazos vencidos"],
          ].map(([n, r]) => (
            <View key={r} style={s.kpi}>
              <Text style={s.kpiNumero}>{n}</Text>
              <Text style={s.kpiRotulo}>{r}</Text>
            </View>
          ))}
        </View>
        <Text style={[s.texto, { marginBottom: 14 }]}>
          {escopo}. Este relatório consolida, por ordem de prioridade, a atuação da ABRAFESTA, o contexto institucional, a situação atual, os interlocutores e os próximos encaminhamentos de cada pauta, com o anexo das pendências em aberto.
        </Text>

        <Text style={[s.mono, { fontSize: 7.5, color: COR.gold, marginTop: 6 }]}>Sumário</Text>
        {[...grupos.entries()].map(([grupo, lista]) => (
          <View key={grupo}>
            <Text style={s.eixoSumario}>
              {grupo} ({lista.length})
            </Text>
            {lista.map((p) => (
              <View key={p.$id} style={s.itemSumario}>
                  <Text style={{ fontSize: 9, lineHeight: 1.3, color: COR.gold, width: 18 }}>{numero.get(p.$id)}.</Text>
                  <View style={{ flexShrink: 1 }}>
                    <Link src={`#pauta-${p.$id}`} style={{ fontSize: 9, lineHeight: 1.3, textDecoration: "none", color: COR.corpo }}>
                      {limpar(p.titulo)}
                    </Link>
                  </View>
                  <View style={{ flexGrow: 1, borderBottomWidth: 0.7, borderBottomColor: COR.rotulo, borderBottomStyle: "dotted", marginHorizontal: 4, marginBottom: 2.5, minWidth: 12 }} />
                  <Text style={{ fontSize: 9, lineHeight: 1.3, color: COR.secundario }}>{paginas.get(p.$id) ?? "—"}</Text>
              </View>
            ))}
          </View>
        ))}
        <View style={s.itemSumario}>
          <Text style={{ fontSize: 9, color: COR.gold, width: 18 }}>A.</Text>
          <Text style={{ fontSize: 9, fontWeight: 600 }}>Anexo — Pendências em aberto</Text>
          <View style={{ flexGrow: 1, borderBottomWidth: 0.7, borderBottomColor: COR.rotulo, borderBottomStyle: "dotted", marginHorizontal: 4, marginBottom: 2.5, minWidth: 12 }} />
          <Text style={{ fontSize: 9, color: COR.secundario }}>{paginas.get("anexo") ?? "—"}</Text>
        </View>

        {/* Pautas */}
        <View break>
          {ordenadas.map((p) => {
            const itens = encaminhamentos.filter((e) => e.pautaId === p.$id).sort((a, b) => a.ordem - b.ordem);
            const pend = abertas.filter((x) => x.pautaId === p.$id);
            return (
              <View key={p.$id} style={s.pautaBloco}>
                <View minPresenceAhead={120}>
                  <Text style={s.pautaEixo}>{limpar(p.eixo)}</Text>
                  <Text
                    style={{ fontSize: 1, lineHeight: 1, color: "#ffffff" }}
                    render={({ pageNumber }) => {
                      paginas.set(p.$id, pageNumber);
                      return " ";
                    }}
                  />
                  <Text id={`pauta-${p.$id}`} style={s.pautaTitulo}>
                    {numero.get(p.$id)}. {limpar(p.titulo)}
                  </Text>
                  <View style={s.chips}>
                    <Text style={[s.chip, estiloPrioridade(p.prioridade), { fontFamily: "IBMPlexMono", fontWeight: 500, textTransform: "uppercase" }]}>
                      {prioridadeLabel(p.prioridade)}
                    </Text>
                    <Text style={[s.chip, { backgroundColor: COR.azulTagBg, color: COR.azulTagTexto }]}>{limpar(p.status)}</Text>
                    {p.dataUltimaMovimentacao ? (
                      <Text style={[s.chip, { color: COR.mudo, paddingHorizontal: 0 }]}>Última movimentação: {fmtDataCurta(p.dataUltimaMovimentacao)}</Text>
                    ) : null}
                  </View>
                </View>

                <Secao titulo="Atuação da ABRAFESTA">{p.atuacao}</Secao>
                <Secao titulo="Contexto institucional">{p.contexto}</Secao>
                <Secao titulo="Situação atual">{p.situacaoAtual}</Secao>
                <Secao titulo="Interlocutores">{p.interlocutores}</Secao>

                {itens.length > 0 && (
                  <View style={s.secao}>
                    <Text style={s.secaoTitulo}>Próximos encaminhamentos</Text>
                    {itens.map((e) => (
                      <View key={e.$id} style={s.encaminhamento} wrap={false}>
                        <View style={[s.caixa, e.concluido ? { backgroundColor: COR.gold, borderColor: COR.gold } : {}]} />
                        <Text style={[s.texto, { flex: 1 }, e.concluido ? { color: COR.rotulo, textDecoration: "line-through" } : {}]}>{limpar(e.texto)}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {pend.length > 0 && (
                  <View style={[s.secao, { borderLeftWidth: 2, borderLeftColor: COR.gold, backgroundColor: "#faf8f4", paddingVertical: 5, paddingHorizontal: 8 }]} wrap={false}>
                    <Text style={s.secaoTitulo}>Pendências vinculadas</Text>
                    {pend.map((x) => (
                      <Text key={x.$id} style={[s.texto, { fontSize: 8.6 }]}>• {limpar(x.descricao)}</Text>
                    ))}
                  </View>
                )}

                {limpar(p.fonteReferencia) && limpar(p.fonteReferencia) !== "—" ? <Text style={s.fonte}>Fonte: {limpar(p.fonteReferencia)}</Text> : null}
              </View>
            );
          })}
        </View>

        {/* Anexo: pendências */}
        <View break>
          <Text style={[s.mono, { fontSize: 7.5, color: COR.gold }]}>Anexo A</Text>
          <Text
            style={s.h1}
            render={({ pageNumber }) => {
              paginas.set("anexo", pageNumber);
              return "Pendências em aberto";
            }}
          />
          <View style={s.filete} />
          <Text style={[s.texto, { marginBottom: 10 }]}>
            {abertasOrdenadas.length} {abertasOrdenadas.length === 1 ? "pendência em aberto" : "pendências em aberto"}, ordenadas por prazo; {vencidas.length} com prazo vencido em {fmtData(geradoEm)}.
          </Text>
          <Text style={{ fontSize: 7.8, lineHeight: 1.45, color: COR.mudo, marginBottom: 10 }}>
            Documento gerado eletronicamente pelo sistema RelGov ABRAFESTA em {fmtData(geradoEm)}, às {fmtHora(geradoEm)} (horário de Brasília), a partir dos dados vigentes na base do Núcleo RelGov. Referência: {referencia}.
          </Text>
          <View style={s.tabelaCab} fixed>
            {[
              ["Pendência", "40%"],
              ["Responsável", "18%"],
              ["Status", "16%"],
              ["Prior.", "8%"],
              ["Prazo", "18%"],
            ].map(([t, w]) => (
              <Text key={t} style={[s.tabelaCabTexto, { width: w }]}>
                {t}
              </Text>
            ))}
          </View>
          {abertasOrdenadas.map((p) => {
            const vencida = ehVencida(p, geradoEm);
            return (
              <View key={p.$id} style={s.tabelaLinha} wrap={false}>
                <Text style={[s.celula, { width: "40%" }]}>{limpar(p.descricao)}</Text>
                <Text style={[s.celula, { width: "18%" }]}>{limpar(p.responsavel)}</Text>
                <Text style={[s.celula, { width: "16%" }]}>{limpar(p.status)}</Text>
                <Text style={[s.celula, { width: "8%", color: p.prioridade === "Alta" ? COR.danger : COR.denso, fontWeight: 600 }]}>{prioridadeLabel(p.prioridade)}</Text>
                <Text style={[s.celula, { width: "18%", color: vencida ? COR.danger : COR.denso }]}>
                  {fmtDataCurta(p.prazoSugerido)}
                  {vencida ? "\nVENCIDO" : ""}
                </Text>
              </View>
            );
          })}

        </View>
      </Page>
    </Document>
  );
}

export async function gerarRelatorioPdf(dados: Dados): Promise<Buffer> {
  registrarFontes();
  const partes = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(dados.geradoEm);
  const g = (t: string) => partes.find((x) => x.type === t)?.value ?? "00";
  const ref = `RELGOV-${g("year")}${g("month")}${g("day")}-${g("hour")}${g("minute")}`;

  // 1ª passada descobre em que página cada pauta caiu; a 2ª imprime o sumário com esses números.
  const paginas = new Map<string, number>();
  await renderToBuffer(<Relatorio dados={dados} paginas={paginas} referencia={ref} />);
  return renderToBuffer(<Relatorio dados={dados} paginas={paginas} referencia={ref} />);
}
