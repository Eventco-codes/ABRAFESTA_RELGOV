import { notFound } from "next/navigation";
import { AppwriteException } from "node-appwrite";

import { PageHeader } from "@/components/relgov/page-header";
import { requireRole } from "@/lib/auth";
import { getPendencia } from "@/lib/relgov/data";
import { buscarPautasParaSelect } from "../../../pautas/actions";
import { updatePendencia } from "../../actions";
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
  const pautas = await buscarPautasParaSelect();

  return (
    <div>
      <PageHeader title="Editar pendência" subtitle={pendencia.descricao} />
      <div className="px-7 py-6">
        <PendenciaForm
          action={updatePendencia.bind(null, id)}
          pautas={pautas}
          pendencia={pendencia}
          cancelHref="/pendencias"
          submitLabel="Salvar alterações"
        />
      </div>
    </div>
  );
}
