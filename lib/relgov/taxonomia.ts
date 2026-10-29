/**
 * Taxonomia fechada de eixos e status das pautas.
 *
 * Antes, `eixo` e `status` eram texto livre (38 eixos e 18 status para 40 pautas), o que deixava
 * os filtros enormes e o painel com "Outros eixos". Aqui ficam as listas fechadas e a tradução dos
 * valores já gravados — assim painel, filtros e formulários já funcionam com os dados antigos, e o
 * script `scripts/normalizar-taxonomia.mjs` pode regravar o banco quando a tradução for aprovada.
 *
 * O formato gravado no campo `eixo` continua sendo uma string só: "Eixo-mãe" ou "Eixo-mãe / subeixo"
 * (sem mudança de esquema no Appwrite).
 */

function normaliza(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

// ───────────────────────── Eixos ─────────────────────────

interface EixoMae {
  nome: string;
  /** Prefixo (normalizado) que já é o próprio nome do eixo — não vira subeixo. */
  proprio: string;
  /** Primeiros segmentos (antes da "/") que pertencem a este eixo. */
  prefixos: string[];
}

const EIXOS: EixoMae[] = [
  { nome: "Trabalhista", proprio: "trabalhista", prefixos: ["trabalhista"] },
  { nome: "Tributário", proprio: "tributario", prefixos: ["tributario"] },
  { nome: "Legislativo", proprio: "legislativo", prefixos: ["legislativo"] },
  { nome: "Formalização e qualificação", proprio: "formalizacao", prefixos: ["formalizacao", "qualificacao"] },
  {
    nome: "Regulatório e licenciamento",
    proprio: "regulatorio",
    prefixos: ["regulatorio", "licenciamento", "conformidade", "direitos autorais"],
  },
  { nome: "Institucional", proprio: "institucional", prefixos: ["institucional", "comunicacao institucional"] },
  { nome: "Política pública e dados", proprio: "", prefixos: ["politica publica", "governanca setorial", "dados"] },
];

export const EIXOS_MAE: string[] = EIXOS.map((e) => e.nome);
export const EIXO_OUTROS = "Outros eixos";

function localizaEixo(valor: string): { eixo: EixoMae; segmento: string; resto: string } | null {
  const [primeiro, ...demais] = valor.split("/");
  const segmento = (primeiro ?? "").trim();
  const norm = normaliza(segmento);
  for (const eixo of EIXOS) {
    if (eixo.prefixos.some((p) => norm === p || norm.startsWith(`${p} `))) {
      return { eixo, segmento, resto: demais.join("/").trim() };
    }
  }
  return null;
}

/** Eixo-mãe de um valor gravado (aceita o formato novo e todos os antigos). */
export function eixoMae(valor: string): string {
  return localizaEixo(valor)?.eixo.nome ?? EIXO_OUTROS;
}

/** Parte "subeixo" de um valor gravado (vazia quando o valor é só o eixo-mãe). */
export function subeixoDe(valor: string): string {
  const achado = localizaEixo(valor);
  if (!achado) return valor.trim();
  const { eixo, segmento, resto } = achado;
  const norm = normaliza(segmento);
  let proprioSub = "";
  // Não repete no subeixo o que já está no nome do eixo ("Licenciamento" em "Regulatório e licenciamento").
  if (norm !== eixo.proprio && !normaliza(eixo.nome).includes(norm)) {
    // "Tributário municipal" → "municipal"; "Qualificação" → "Qualificação"
    proprioSub = eixo.proprio && norm.startsWith(`${eixo.proprio} `) ? segmento.slice(eixo.proprio.length).trim() : segmento;
  }
  return [proprioSub, resto].filter(Boolean).join(" / ");
}

/** Valor a gravar no campo `eixo`: "Mãe" ou "Mãe / subeixo". */
export function montarEixo(mae: string, sub?: string | null): string {
  const s = (sub ?? "").trim();
  return s ? `${mae} / ${s}` : mae;
}

/** Valor já no formato canônico (eixo-mãe da lista + subeixo opcional). */
export function eixoNormalizado(valor: string): string {
  return montarEixo(eixoMae(valor), subeixoDe(valor));
}

// ───────────────────────── Status ─────────────────────────

/** Ordem aproximada do ciclo de vida de uma pauta. */
export const STATUS_PAUTA = [
  "Nova ação",
  "Em acompanhamento",
  "Em tramitação",
  "Aguardando parecer ou despacho",
  "Pronta para votação",
  "Aprovada / sancionada",
  "Em regulamentação",
  "Requalificada",
  "Arquivada",
] as const;

export const STATUS_PADRAO = "Em acompanhamento";

const STATUS_LEGADO: Record<string, (typeof STATUS_PAUTA)[number]> = {
  "nova acao": "Nova ação",
  "em acompanhamento": "Em acompanhamento",
  "em andamento": "Em acompanhamento",
  ativa: "Em acompanhamento",
  "pauta complementar": "Em acompanhamento",
  "vigencia prorrogada — monitorar": "Em acompanhamento",
  "em tramitacao (fase de conclusao)": "Em tramitação",
  "em tramitacao nas comissoes": "Em tramitação",
  "aguardando plenario do senado": "Em tramitação",
  "aguardando parecer na cft": "Aguardando parecer ou despacho",
  "aguardando despacho": "Aguardando parecer ou despacho",
  "pronta para pauta — acompanhar votacao": "Pronta para votação",
  "sancionada (lc 227/2026)": "Aprovada / sancionada",
  "lei sancionada — regulamentacao em curso": "Em regulamentação",
  requalificada: "Requalificada",
  "mantida / requalificada": "Requalificada",
  "requalificada / integrada ao pl 1905": "Requalificada",
  arquivado: "Arquivada",
};

/**
 * Status canônico de um valor gravado. Os valores conhecidos têm tradução exata; o texto cru que a
 * varredura da Câmara gravava (ex.: "Aguardando Designação de Relator") cai na regra por palavra-chave.
 */
export function statusCanonico(valor: string): (typeof STATUS_PAUTA)[number] {
  const norm = normaliza(valor);
  if ((STATUS_PAUTA as readonly string[]).some((s) => normaliza(s) === norm)) {
    return STATUS_PAUTA.find((s) => normaliza(s) === norm)!;
  }
  const exato = STATUS_LEGADO[norm];
  if (exato) return exato;
  if (/arquiv/.test(norm)) return "Arquivada";
  if (/sancion|transformad.*lei|norma juridica/.test(norm)) return "Aprovada / sancionada";
  if (/regulament/.test(norm)) return "Em regulamentação";
  if (/pronta|pauta.*plenario|aguardando.*vota/.test(norm)) return "Pronta para votação";
  if (/aguardando|parecer|despacho|relator|designa/.test(norm)) return "Aguardando parecer ou despacho";
  if (/tramit|comiss|plenario|senado/.test(norm)) return "Em tramitação";
  return STATUS_PADRAO;
}
