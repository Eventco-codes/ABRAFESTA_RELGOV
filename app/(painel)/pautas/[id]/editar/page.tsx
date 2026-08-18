import { notFound } from "next/navigation";
import { AppwriteException } from "node-appwrite";

import { PageHeader } from "@/components/relgov/page-header";
import { requireRole } from "@/lib/auth";
import { getPauta } from "@/lib/relgov/data";
import { updatePauta } from "../../actions";
import { PautaForm } from "../../pauta-form";

export default async function EditarPautaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { tablesDB } = await requireRole("administrador");

  const pauta = await getPauta(tablesDB, id).catch((err) => {
    if (err instanceof AppwriteException && err.code === 404) notFound();
    throw err;
  });

  return (
    <div>
      <PageHeader title="Editar pauta" subtitle={pauta.titulo} />
      <div className="px-7 py-6">
        <PautaForm
          action={updatePauta.bind(null, id)}
          pauta={pauta}
          cancelHref={`/pautas/${id}`}
          submitLabel="Salvar alterações"
        />
      </div>
    </div>
  );
}
