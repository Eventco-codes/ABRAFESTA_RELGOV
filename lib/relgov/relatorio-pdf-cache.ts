import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { gerarRelatorioPdf } from "@/lib/relgov/relatorio-pdf";

type Dados = Parameters<typeof gerarRelatorioPdf>[0];

/**
 * Gerar o PDF custa ~3,5 s de CPU num PC e dezenas de segundos na hospedagem compartilhada
 * (1 núcleo, 1 GB, limites que a conta já estoura). Por isso o resultado é guardado e reaproveitado:
 *  - a chave é o conteúdo (pautas, encaminhamentos, pendências — o `$updatedAt` de cada registro
 *    entra no hash), o escopo, quem emite e o DIA (o "VENCIDO" depende da data de hoje);
 *  - vale em memória e em disco (sobrevive a reinício do app);
 *  - pedidos iguais simultâneos esperam a mesma geração e as gerações rodam uma de cada vez, para
 *    vários cliques não empilharem CPU/memória e derrubarem o site.
 *
 * Geração agendada: de madrugada um agendador (cron) chama `preGerarRelatorioPdf` e o relatório do
 * dia já fica pronto, emitido por EMITENTE_AUTOMATICO. Quando o usuário pede o PDF, a ordem é:
 *  1) um PDF já gerado com o nome dele  2) o PDF agendado do dia (se os dados ainda são os mesmos)
 *  3) gerar na hora. O PDF reaproveitado mantém a data/hora de emissão da geração original.
 */
export const EMITENTE_AUTOMATICO = "Núcleo RelGov (emissão automática)";

const VERSAO = "4"; // aumente ao mudar o layout do PDF, para descartar o cache antigo
const MAX_EM_MEMORIA = 6;
const VALIDADE_DISCO_MS = 3 * 24 * 60 * 60 * 1000;
const DIR = path.join(os.tmpdir(), "relgov-pdf-cache");

const memoria = new Map<string, Buffer>();
const emAndamento = new Map<string, Promise<Buffer>>();
let fila: Promise<unknown> = Promise.resolve();

function dia(d: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(d);
}

function chave(dados: Dados) {
  const { pautas, encaminhamentos, pendencias, apenasAlta, emitidoPor, geradoEm } = dados;
  return createHash("sha256")
    .update(JSON.stringify({ VERSAO, dia: dia(geradoEm), apenasAlta, emitidoPor, pautas, encaminhamentos, pendencias }))
    .digest("hex");
}

function guardarEmMemoria(k: string, pdf: Buffer) {
  memoria.delete(k);
  memoria.set(k, pdf);
  while (memoria.size > MAX_EM_MEMORIA) memoria.delete(memoria.keys().next().value as string);
}

function arquivoDoCache(k: string) {
  return path.join(DIR, `${k}.pdf`);
}

async function existeNoDisco(k: string): Promise<boolean> {
  try {
    const { mtimeMs } = await fs.stat(arquivoDoCache(k));
    return Date.now() - mtimeMs <= VALIDADE_DISCO_MS;
  } catch {
    return false;
  }
}

async function lerDoDisco(k: string): Promise<Buffer | null> {
  try {
    if (!(await existeNoDisco(k))) return null;
    return await fs.readFile(arquivoDoCache(k));
  } catch {
    return null;
  }
}

async function gravarNoDisco(k: string, pdf: Buffer) {
  try {
    await fs.mkdir(DIR, { recursive: true });
    const destino = arquivoDoCache(k);
    const temp = `${destino}.${process.pid}.tmp`;
    await fs.writeFile(temp, pdf);
    await fs.rename(temp, destino); // atômico: nunca expõe um PDF pela metade
    // limpeza de entradas antigas (melhor esforço)
    for (const nome of await fs.readdir(DIR)) {
      const p = path.join(DIR, nome);
      const { mtimeMs } = await fs.stat(p).catch(() => ({ mtimeMs: Date.now() }));
      if (Date.now() - mtimeMs > VALIDADE_DISCO_MS) await fs.rm(p, { force: true });
    }
  } catch {
    // disco indisponível: segue só com o cache em memória
  }
}

/** O que já está pronto (memória ou disco) para esta chave, sem gerar nada. */
async function pronto(k: string): Promise<Buffer | null> {
  const quente = memoria.get(k);
  if (quente) return quente;
  const doDisco = await lerDoDisco(k);
  if (doDisco) guardarEmMemoria(k, doDisco);
  return doDisco;
}

/** Gera (uma geração por vez), guarda em memória e disco. Pedidos iguais compartilham a promessa. */
function produzir(k: string, dados: Dados, adiarMs = 0): Promise<Buffer> {
  const pendente = emAndamento.get(k);
  if (pendente) return pendente;

  const trabalho = (async () => {
    // `adiarMs`: deixa a resposta HTTP do agendador sair antes de a geração ocupar o processo.
    if (adiarMs > 0) await new Promise((r) => setTimeout(r, adiarMs));
    const minhaVez = fila.then(() => gerarRelatorioPdf(dados));
    fila = minhaVez.catch(() => undefined); // a fila segue mesmo se uma geração falhar
    const pdf = await minhaVez;
    guardarEmMemoria(k, pdf);
    void gravarNoDisco(k, pdf);
    return pdf;
  })().finally(() => emAndamento.delete(k));

  emAndamento.set(k, trabalho);
  return trabalho;
}

/** De onde veio o PDF entregue (vai no cabeçalho X-Relatorio-Origem, para conferir o agendamento). */
export type OrigemPdf = "proprio-em-cache" | "agendado" | "aguardou-geracao" | "gerado-agora";

/** PDF para o usuário: o dele, senão o agendado do dia (mesmos dados), senão gera na hora. */
export async function obterRelatorioPdf(dados: Dados): Promise<{ pdf: Buffer; origem: OrigemPdf }> {
  const kUsuario = chave(dados);
  const dele = await pronto(kUsuario);
  if (dele) return { pdf: dele, origem: "proprio-em-cache" };

  const geracaoDele = emAndamento.get(kUsuario);
  if (geracaoDele) return { pdf: await geracaoDele, origem: "aguardou-geracao" };

  const kAgendado = chave({ ...dados, emitidoPor: EMITENTE_AUTOMATICO });
  const agendado = await pronto(kAgendado);
  if (agendado) return { pdf: agendado, origem: "agendado" };

  const geracaoAgendada = emAndamento.get(kAgendado);
  if (geracaoAgendada) return { pdf: await geracaoAgendada, origem: "aguardou-geracao" }; // a agendada já está rodando

  return { pdf: await produzir(kUsuario, dados), origem: "gerado-agora" };
}

export type SituacaoPreGeracao = "pronto" | "em-andamento" | "iniciado";

/**
 * Para o agendador: garante que o PDF do dia exista, SEM esperar a geração terminar (a requisição
 * do cron responde na hora; a geração segue em segundo plano e grava no cache).
 */
export async function preGerarRelatorioPdf(dados: Dados): Promise<SituacaoPreGeracao> {
  const agendado = { ...dados, emitidoPor: EMITENTE_AUTOMATICO };
  const k = chave(agendado);
  if (memoria.has(k) || (await existeNoDisco(k))) return "pronto";
  if (emAndamento.has(k)) return "em-andamento";
  void produzir(k, agendado, 1500).catch((e) => console.error("[pdf-agendado] falha ao gerar:", e));
  return "iniciado";
}
