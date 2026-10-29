"use server";

import { revalidatePath } from "next/cache";
import { ID } from "node-appwrite";
import { z } from "zod";

import { APPWRITE_DATABASE_ID, STORAGE_BUCKET_ID, TABLES } from "@/lib/appwrite/constants";
import { requireRole } from "@/lib/auth";

export interface ProjetoFormState {
  error?: string;
}

const projetoSchema = z.object({
  ministerioId: z.string().min(1),
  ministerioNome: z.string().min(1),
  titulo: z.string().min(3, "Informe o título do projeto."),
  data: z.string().optional(),
  contexto: z.string().optional(),
  link: z.string().url().optional().or(z.literal("")),
});

/** Cria um projeto vinculado a um ministério, com N responsáveis e N anexos. */
export async function criarProjetoMinisterio(
  _prev: ProjetoFormState,
  formData: FormData
): Promise<ProjetoFormState> {
  const { tablesDB, storage, user } = await requireRole("administrador", "coordenadorrelgov");

  const parsed = projetoSchema.safeParse({
    ministerioId: formData.get("ministerioId"),
    ministerioNome: formData.get("ministerioNome"),
    titulo: formData.get("titulo"),
    data: formData.get("data") ?? undefined,
    contexto: formData.get("contexto") ?? undefined,
    link: formData.get("link") ?? undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const nomes = formData.getAll("respNome").map(String);
  const telefones = formData.getAll("respTelefone").map(String);
  const emails = formData.getAll("respEmail").map(String);
  const responsaveis = nomes
    .map((nome, i) => ({ nome: nome.trim(), telefone: telefones[i]?.trim() || null, email: emails[i]?.trim() || null }))
    .filter((r) => r.nome.length > 0);

  const criadoPorNome = user.name || user.email;
  const projetoId = ID.unique();

  await tablesDB.createRow({
    databaseId: APPWRITE_DATABASE_ID,
    tableId: TABLES.ministerioProjetos,
    rowId: projetoId,
    data: {
      ministerioId: parsed.data.ministerioId,
      ministerioNome: parsed.data.ministerioNome,
      titulo: parsed.data.titulo,
      data: parsed.data.data || null,
      contexto: parsed.data.contexto || null,
      link: parsed.data.link || null,
      criadoPorNome,
    },
  });

  await Promise.all(
    responsaveis.map((r) =>
      tablesDB.createRow({
        databaseId: APPWRITE_DATABASE_ID,
        tableId: TABLES.ministerioProjetoResponsaveis,
        rowId: ID.unique(),
        data: { projetoId, nome: r.nome, telefone: r.telefone, email: r.email },
      })
    )
  );

  const arquivos = formData.getAll("arquivos").filter((f): f is File => f instanceof File && f.size > 0);
  for (const arquivo of arquivos) {
    try {
      const arquivoCriado = await storage.createFile({
        bucketId: STORAGE_BUCKET_ID,
        fileId: ID.unique(),
        file: arquivo,
      });
      await tablesDB.createRow({
        databaseId: APPWRITE_DATABASE_ID,
        tableId: TABLES.ministerioProjetoAnexos,
        rowId: ID.unique(),
        data: {
          projetoId,
          fileId: arquivoCriado.$id,
          nome: arquivo.name,
          tamanho: arquivo.size,
          tipoMime: arquivo.type || null,
          criadoPorNome,
        },
      });
    } catch (err) {
      revalidatePath(`/ministerios/${parsed.data.ministerioId}`);
      return {
        error: `Projeto criado, mas falhou ao anexar "${arquivo.name}": ${err instanceof Error ? err.message : "erro desconhecido"}`,
      };
    }
  }

  revalidatePath(`/ministerios/${parsed.data.ministerioId}`);
  return {};
}

export interface DirecaoFormState {
  error?: string;
}

const direcaoSchema = z.object({
  ministerioId: z.string().min(1),
  ministroNome: z.string().optional(),
  ministroTelefone: z.string().optional(),
  ministroEmail: z.string().email().optional().or(z.literal("")),
  chefeGabineteNome: z.string().optional(),
  chefeGabineteTelefone: z.string().optional(),
  chefeGabineteEmail: z.string().email().optional().or(z.literal("")),
});

/** Cria ou atualiza o contato do Ministro/Chefe de Gabinete (1 registro por ministério, rowId = ministerioId). */
export async function salvarDirecaoMinisterio(
  _prev: DirecaoFormState,
  formData: FormData
): Promise<DirecaoFormState> {
  const { tablesDB, user } = await requireRole("administrador", "coordenadorrelgov");

  const parsed = direcaoSchema.safeParse({
    ministerioId: formData.get("ministerioId"),
    ministroNome: formData.get("ministroNome") ?? undefined,
    ministroTelefone: formData.get("ministroTelefone") ?? undefined,
    ministroEmail: formData.get("ministroEmail") ?? undefined,
    chefeGabineteNome: formData.get("chefeGabineteNome") ?? undefined,
    chefeGabineteTelefone: formData.get("chefeGabineteTelefone") ?? undefined,
    chefeGabineteEmail: formData.get("chefeGabineteEmail") ?? undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { ministerioId, ...campos } = parsed.data;
  const data = {
    ministroNome: campos.ministroNome?.trim() || null,
    ministroTelefone: campos.ministroTelefone?.trim() || null,
    ministroEmail: campos.ministroEmail?.trim() || null,
    chefeGabineteNome: campos.chefeGabineteNome?.trim() || null,
    chefeGabineteTelefone: campos.chefeGabineteTelefone?.trim() || null,
    chefeGabineteEmail: campos.chefeGabineteEmail?.trim() || null,
    atualizadoPorNome: user.name || user.email,
  };

  try {
    await tablesDB.updateRow({
      databaseId: APPWRITE_DATABASE_ID,
      tableId: TABLES.ministerioDirecao,
      rowId: ministerioId,
      data,
    });
  } catch {
    await tablesDB.createRow({
      databaseId: APPWRITE_DATABASE_ID,
      tableId: TABLES.ministerioDirecao,
      rowId: ministerioId,
      data,
    });
  }

  revalidatePath(`/ministerios/${ministerioId}`);
  return {};
}

/** Remove um anexo de projeto (arquivo no Storage + linha). */
export async function excluirAnexoProjeto(anexoId: string, ministerioId: string) {
  const { tablesDB, storage } = await requireRole("administrador", "coordenadorrelgov");

  const anexo = await tablesDB.getRow({
    databaseId: APPWRITE_DATABASE_ID,
    tableId: TABLES.ministerioProjetoAnexos,
    rowId: anexoId,
  });

  await storage.deleteFile({ bucketId: STORAGE_BUCKET_ID, fileId: anexo.fileId as string });
  await tablesDB.deleteRow({
    databaseId: APPWRITE_DATABASE_ID,
    tableId: TABLES.ministerioProjetoAnexos,
    rowId: anexoId,
  });

  revalidatePath(`/ministerios/${ministerioId}`);
}
