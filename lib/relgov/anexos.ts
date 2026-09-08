import type { Anexo } from "@/lib/types";

/** URL de download autenticado (ver app/api/anexos/[fileId]/route.ts). */
export function anexoHref(anexo: Pick<Anexo, "fileId" | "nome" | "tipoMime">): string {
  const params = new URLSearchParams({ nome: anexo.nome });
  if (anexo.tipoMime) params.set("tipo", anexo.tipoMime);
  return `/api/anexos/${anexo.fileId}?${params.toString()}`;
}

export function formatTamanhoArquivo(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
