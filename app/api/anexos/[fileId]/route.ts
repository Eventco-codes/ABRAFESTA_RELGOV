import { NextRequest, NextResponse } from "next/server";
import { AppwriteException } from "node-appwrite";

import { STORAGE_BUCKET_ID } from "@/lib/appwrite/constants";
import { requireSession } from "@/lib/auth";

/** Download autenticado (sessão RelGov) de um documento anexado — evita expor o bucket direto. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  const { storage } = await requireSession();
  const { fileId } = await params;
  const nome = request.nextUrl.searchParams.get("nome") ?? "documento";
  const tipo = request.nextUrl.searchParams.get("tipo") || "application/octet-stream";

  let buffer: ArrayBuffer;
  try {
    buffer = await storage.getFileDownload({ bucketId: STORAGE_BUCKET_ID, fileId });
  } catch (err) {
    if (err instanceof AppwriteException && err.code === 404) {
      return NextResponse.json({ error: "Arquivo não encontrado." }, { status: 404 });
    }
    throw err;
  }

  // filename="..." é lido literalmente pela maioria dos navegadores (não faz
  // URI-decode) — por isso o fallback ASCII vem à parte, e o nome real (com
  // acentos) vai em filename*= (RFC 5987), que os navegadores modernos usam.
  const nomeAscii = nome.replace(/[^\x20-\x7E]/g, "_").replace(/"/g, "'");

  return new NextResponse(Buffer.from(buffer), {
    headers: {
      "Content-Type": tipo,
      "Content-Disposition": `attachment; filename="${nomeAscii}"; filename*=UTF-8''${encodeURIComponent(nome)}`,
      "Cache-Control": "private, max-age=0, no-cache",
    },
  });
}
