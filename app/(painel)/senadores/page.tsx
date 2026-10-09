import { PageHeader } from "@/components/relgov/page-header";
import { requireSession } from "@/lib/auth";
import { listSenadores } from "@/lib/senado/data";
import { filtrarSenadores, partidosDisponiveis, ufsDisponiveis } from "@/lib/senado/filters";
import { SenadoresFiltros } from "./senadores-filtros";
import { SenadoresTabela } from "./senadores-tabela";

export default async function SenadoresPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const { tablesDB } = await requireSession();
  const senadores = await listSenadores(tablesDB);

  const filtrados = filtrarSenadores(senadores, {
    busca: params.busca,
    partido: params.partido,
    uf: params.uf,
  });

  return (
    <div>
      <PageHeader
        title="Senadores"
        subtitle={
          senadores.length === 0
            ? "Nenhum senador sincronizado ainda — rode o sync do Senado (POST /api/senado/sync?mode=senadores)."
            : `${filtrados.length} de ${senadores.length} senadores · dados públicos do Senado Federal`
        }
      />

      <div className="px-7">
        <div className="print:hidden">
          <SenadoresFiltros
            partidos={partidosDisponiveis(senadores)}
            ufs={ufsDisponiveis(senadores)}
            defaults={params}
          />
        </div>

        <SenadoresTabela senadores={filtrados} />
      </div>
    </div>
  );
}

