import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { gerarRelatorioPdf } from "@/lib/relgov/relatorio-pdf";

type Dados = Parameters<typeof gerarRelatorioPdf>[0];

/**
 * Gerar o PDF custa ~3,5 s de CPU num PC e dezenas de segundos na hospedagem compartilhada
 * (1 núcleo, 1 GB). Por isso o resultado é guardado e reaproveitado quando nada mudou:
 *  - a chave é o conteúdo (pautas, encaminhamentos, pendências — o `$updatedAt` de cada registro
 *    entra no hash), o escopo, quem emite e o DIA (o "VENCIDO" depende da data de hoje);
 *  - vale em memória e em disco (sobrevive a reinício do app);
 *  - pedidos iguais simultâneos esperam a mesma geração e as gerações rodam uma de cada vez, para
 *    vários cliques não empilharem CPU/memória e derrubarem o site.
 * O PDF reaproveitado mantém a data/hora de emissão da geração original: os dados são idênticos.
 */
const VERSAO = "3"; // aumente ao mudar o layout do PDF, para descartar o cache antigo
const MAX_EM_MEMORIA = 4;
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

async function lerDoDisco(k: string): Promise<Buffer | null> {
  try {
    const arquivo = path.join(DIR, `${k}.pdf`);
    const { mtimeMs } = await fs.stat(arquivo);
    if (Date.now() - mtimeMs > VALIDADE_DISCO_MS) return null;
    return await fs.readFile(arquivo);
  } catch {
    return null;
  }
}

async function gravarNoDisco(k: string, pdf: Buffer) {
  try {
    await fs.mkdir(DIR, { recursive: true });
    const destino = path.join(DIR, `${k}.pdf`);
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

export async function obterRelatorioPdf(dados: Dados): Promise<Buffer> {
  const k = chave(dados);

  const quente = memoria.get(k);
  if (quente) return quente;

  const pendente = emAndamento.get(k);
  if (pendente) return pendente;

  const trabalho = (async () => {
    const doDisco = await lerDoDisco(k);
    if (doDisco) {
      guardarEmMemoria(k, doDisco);
      return doDisco;
    }
    // uma geração por vez (a fila segue mesmo se uma falhar)
    const minhaVez = fila.then(() => gerarRelatorioPdf(dados));
    fila = minhaVez.catch(() => undefined);
    const pdf = await minhaVez;
    guardarEmMemoria(k, pdf);
    void gravarNoDisco(k, pdf);
    return pdf;
  })().finally(() => emAndamento.delete(k));

  emAndamento.set(k, trabalho);
  return trabalho;
}
