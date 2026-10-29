"use client";

/**
 * Gera uma planilha (.xls, formato HTML reconhecido pelo Excel/LibreOffice —
 * sem dependência de biblioteca) a partir de colunas + linhas, e dispara o
 * download no navegador.
 */
export function baixarPlanilha(
  nomeArquivo: string,
  colunas: string[],
  linhas: (string | number)[][]
): void {
  const escapar = (v: string | number) =>
    String(v ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

  const cabecalho = `<tr>${colunas.map((c) => `<th>${escapar(c)}</th>`).join("")}</tr>`;
  const corpo = linhas
    .map((linha) => `<tr>${linha.map((v) => `<td>${escapar(v)}</td>`).join("")}</tr>`)
    .join("");
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"></head><body><table>${cabecalho}${corpo}</table></body></html>`;

  const blob = new Blob(["﻿" + html], { type: "application/vnd.ms-excel" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nomeArquivo.endsWith(".xls") ? nomeArquivo : `${nomeArquivo}.xls`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
