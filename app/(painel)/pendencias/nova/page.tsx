import { PageHeader } from "@/components/relgov/page-header";
import { requireRole } from "@/lib/auth";
import { buscarPautasParaSelect } from "../../pautas/actions";
import { createPendencia } from "../actions";
import { PendenciaForm } from "../pendencia-form";

export default async function NovaPendenciaPage({
  searchParams,
}: {
  searchParams: Promise<{ pautaId?: string }>;
}) {
  await requireRole("administrador", "coordenador_relgov");
  const { pautaId } = await searchParams;
  const pautas = await buscarPautasParaSelect();

  return (
    <div>
      <PageHeader title="Nova pendência" subtitle="Cadastro de pendência vinculada a uma pauta." />
      <div className="px-7 py-6">
        <PendenciaForm
          action={createPendencia}
          pautas={pautas}
          defaultPautaId={pautaId}
          cancelHref="/pendencias"
          submitLabel="Criar pendência"
        />
      </div>
    </div>
  );
}
