import { notFound } from "next/navigation";
import { AppwriteException } from "node-appwrite";

import { PageHeader } from "@/components/relgov/page-header";
import { requireRole } from "@/lib/auth";
import { getPendencia, listAnexosPendencia } from "@/lib/relgov/data";
import { buscarPautasParaSelect } from "../../../pautas/actions";
import { updatePendencia } from "../../actions";
import { AnexoItem } from "../../anexo-item";
import { AnexoUploadForm } from "../../anexo-upload-form";
import { PendenciaForm } from "../../pendencia-form";

export default async function EditarPendenciaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { tablesDB } = await requireRole("administrador", "coordenadorrelgov");

  const pendencia = await getPendencia(tablesDB, id).catch((err) => {
    if (err instanceof AppwriteException && err.code === 404) notFound();
    throw err;
  });
  const [pautas, anexos] = await Promise.all([
    buscarPautasParaSelect(),
    listAnexosPendencia(tablesDB, id),
  ]);

  return (
    <div>
      <PageHeader title="Editar pendência" subtitle={pendencia.descricao} />
      <div className="grid grid-cols-1 gap-8 px-7 py-6 lg:grid-cols-[1fr_320px]">
        <PendenciaForm
          action={updatePendencia.bind(null, id)}
          pautas={pautas}
          pendencia={pendencia}
          cancelHref="/pendencias"
          submitLabel="Salvar alterações"
        />

        <div>
          <p className="relgov-label text-[10px]">Documentos e imagens</p>
          <div className="mt-2 flex flex-col gap-2">
            {anexos.map((anexo) => (
              <AnexoItem key={anexo.$id} anexo={anexo} pendenciaId={id} editable />
            ))}
            {anexos.length === 0 && (
              <p className="text-[12.5px] text-relgov-muted">Nenhum anexo ainda.</p>
            )}
          </div>
          <div className="mt-3">
            <AnexoUploadForm pendenciaId={id} />
          </div>
        </div>
      </div>
    </div>
  );
}
