import { PageHeader } from "@/components/relgov/page-header";
import { requireRole } from "@/lib/auth";
import { createPauta } from "../actions";
import { PautaForm } from "../pauta-form";

export default async function NovaPautaPage() {
  await requireRole("administrador");

  return (
    <div>
      <PageHeader title="Nova pauta" subtitle="Cadastro completo de uma nova pauta." />
      <div className="px-7 py-6">
        <PautaForm
          action={createPauta}
          cancelHref="/pautas"
          submitLabel="Criar pauta"
          showEncaminhamentos
        />
      </div>
    </div>
  );
}
