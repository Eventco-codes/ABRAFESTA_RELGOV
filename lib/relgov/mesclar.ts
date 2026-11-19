import type { Movimentacao } from "@/lib/types";

/** Limites das colunas da tabela `movimentacoes` (ver scripts/setup-appwrite.mjs). */
export const LIMITE_TITULO = 255;
export const LIMITE_DESCRICAO = 2000;
export const MAX_REGISTROS_POR_MESCLAGEM = 20;

/** Linhas curtas demais não são descartadas por "estarem contidas" em outra (evita perder "Sim.", "Ok"). */
const MIN_CARACTERES_CONTENCAO = 25;

const ORIGEM_LABEL: Record<string, string> = {
  VARREDURA_AUTOMATICA: "Varredura automática",
  REGISTRO_MANUAL: "Registro manual",
};

export type MovimentacaoFonte = Pick<
  Movimentacao,
  "$id" | "$createdAt" | "data" | "origem" | "titulo" | "descricao" | "criadoPorNome"
>;

export interface MesclagemProposta {
  /** Registro que permanece (o mais recente) e recebe o conteúdo unido. */
  principalId: string;
  /** Registros que passam a estar integralmente contidos no principal e podem ser excluídos. */
  excluirIds: string[];
  titulo: string;
  descricao: string;
  criadoPorNome: string | null;
}

export type MesclagemResultado =
  | ({ ok: true } & MesclagemProposta)
  | { ok: false; error: string };

const formatadorData = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

function formatarData(iso: string): string {
  const data = new Date(iso);
  return Number.isNaN(data.getTime()) ? iso : formatadorData.format(data);
}

/** Comparação sem acentos, caixa, pontuação ou espaços repetidos. */
export function normalizar(texto: string): string {
  return texto
    .normalize("NFKD") // NFKD também reduz "ª"/"º" e ligaduras à forma básica
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function linhasDe(texto: string): string[] {
  return texto
    .split(/\r?\n/)
    .map((linha) => linha.trim())
    .filter(Boolean);
}

function porDataDesc(a: MovimentacaoFonte, b: MovimentacaoFonte) {
  return (
    new Date(b.data).getTime() - new Date(a.data).getTime() ||
    new Date(b.$createdAt).getTime() - new Date(a.$createdAt).getTime()
  );
}

/**
 * Une várias movimentações em uma só, sem perder conteúdo e sem repetir informação.
 *
 * - O registro mais recente é o principal: mantém título, data e origem.
 * - O texto dos demais entra na descrição, do mais antigo ao mais novo, cada bloco
 *   identificado por data/título (e origem/autor quando diferem do principal).
 * - Duplicidade é removida por linha: linhas equivalentes (ignorando acento, caixa e
 *   pontuação) ou integralmente contidas em outra linha mais completa são omitidas.
 * - Nada é truncado: se o resultado não couber na coluna, devolve erro e nada deve ser alterado.
 */
export function calcularMesclagem(registros: MovimentacaoFonte[]): MesclagemResultado {
  if (registros.length < 2) {
    return { ok: false, error: "Selecione ao menos 2 registros para mesclar." };
  }
  if (registros.length > MAX_REGISTROS_POR_MESCLAGEM) {
    return {
      ok: false,
      error: `Selecione no máximo ${MAX_REGISTROS_POR_MESCLAGEM} registros por mesclagem.`,
    };
  }

  const [principal, ...demais] = [...registros].sort(porDataDesc);
  const outros = demais.reverse(); // do mais antigo para o mais novo
  const ordem = [principal, ...outros];

  // Linhas candidatas, em ordem de prioridade (principal primeiro, depois cronológico).
  const candidatas = ordem.flatMap((registro, bloco) =>
    linhasDe(registro.descricao).map((texto) => ({ bloco, texto, norma: normalizar(texto) }))
  );

  const mantidas = candidatas.filter((atual, i) => {
    if (!atual.norma) return true; // só símbolos/pontuação: preserva
    return !candidatas.some((outra, j) => {
      if (i === j || !outra.norma) return false;
      if (outra.norma === atual.norma) return j < i;
      return (
        atual.norma.length >= MIN_CARACTERES_CONTENCAO &&
        outra.norma.length > atual.norma.length &&
        outra.norma.includes(atual.norma)
      );
    });
  });

  const corpoDe = (bloco: number) =>
    mantidas.filter((linha) => linha.bloco === bloco).map((linha) => linha.texto);

  const tituloPrincipalNorma = normalizar(principal.titulo);
  const criadorPrincipalNorma = principal.criadoPorNome ? normalizar(principal.criadoPorNome) : "";
  const dataPrincipal = formatarData(principal.data);

  const partes: string[] = [];
  const corpoPrincipal = corpoDe(0);
  if (corpoPrincipal.length > 0) partes.push(corpoPrincipal.join("\n"));

  outros.forEach((registro, idx) => {
    const corpo = corpoDe(idx + 1);
    const data = formatarData(registro.data);
    const titulo = registro.titulo.trim();
    const mesmoTitulo = normalizar(titulo) === tituloPrincipalNorma;
    const corpoNorma = normalizar(corpo.join(" "));

    const detalhes: string[] = [];
    if (registro.origem !== principal.origem) {
      detalhes.push(ORIGEM_LABEL[registro.origem] ?? registro.origem);
    }
    const autor = registro.criadoPorNome?.trim();
    if (autor) {
      const autorNorma = normalizar(autor);
      const jaNoTexto = corpoNorma.includes(autorNorma);
      if (autorNorma !== criadorPrincipalNorma && !jaNoTexto) detalhes.push(`por ${autor}`);
    }

    // Registro idêntico ao principal no que importa (mesmo dia, mesmo título, nada novo): nada a acrescentar.
    if (corpo.length === 0 && mesmoTitulo && data === dataPrincipal && detalhes.length === 0) {
      return;
    }

    const cabecalho =
      `[${data}]` +
      (mesmoTitulo ? "" : ` ${titulo}`) +
      (detalhes.length > 0 ? ` (${detalhes.join(" · ")})` : "");
    partes.push(corpo.length > 0 ? `${cabecalho}\n${corpo.join("\n")}` : cabecalho);
  });

  const descricao = partes.join("\n\n");

  if (descricao.length > LIMITE_DESCRICAO) {
    const excesso = descricao.length - LIMITE_DESCRICAO;
    return {
      ok: false,
      error: `O texto mesclado teria ${descricao.length} caracteres, ${excesso} acima do limite de ${LIMITE_DESCRICAO} do campo. Nada foi alterado — selecione menos registros ou resuma o conteúdo antes.`,
    };
  }
  if (principal.titulo.length > LIMITE_TITULO) {
    return { ok: false, error: `O título excede ${LIMITE_TITULO} caracteres.` };
  }

  const criadoPorNome =
    principal.criadoPorNome ?? outros.find((r) => r.criadoPorNome)?.criadoPorNome ?? null;

  return {
    ok: true,
    principalId: principal.$id,
    excluirIds: outros.map((r) => r.$id),
    titulo: principal.titulo,
    descricao,
    criadoPorNome,
  };
}
