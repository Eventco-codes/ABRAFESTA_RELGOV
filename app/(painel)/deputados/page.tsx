import Link from "next/link";

import { PageHeader } from "@/components/relgov/page-header";
import { requireSession } from "@/lib/auth";
import { listDeputados } from "@/lib/camara/data";
import {
  filtrarDeputados,
  idsDeputadosAutoresEmTramitacao,
  partidosDisponiveis,
  ufsDisponiveis,
} from "@/lib/camara/filters";
import { listPautas } from "@/lib/relgov/data";
import { pautasLegislativas } from "@/lib/relgov/filters";
import { DeputadosFiltros } from "./deputados-filtros";
import { DeputadosTabela } from "./deputados-tabela";

const PAGE_SIZE = 20;

type CampoOrdenacao = "nome" | "autor" | "uf";

function parseOrdenar(valor: string | undefined): { campo: CampoOrdenacao; direcao: "asc" | "desc" } {
  const [campo, direcao] = (valor ?? "nome_asc").split("_");
  if ((campo === "nome" || campo === "autor" || campo === "uf") && (direcao === "asc" || direcao === "desc")) {
    return { campo, direcao };
  }
  return { campo: "nome", direcao: "asc" };
}

export default async function DeputadosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const { tablesDB } = await requireSession();
  const [deputados, pautas] = await Promise.all([listDeputados(tablesDB), listPautas(tablesDB)]);

  const idsAutores = idsDeputadosAutoresEmTramitacao(deputados, pautasLegislativas(pautas));

  const filtrados = filtrarDeputados(deputados, {
    busca: params.busca,
    partido: params.partido,
    uf: params.uf,
  });

  const { campo: ordenarCampo, direcao: ordenarDirecao } = parseOrdenar(params.ordenar);
  const sinal = ordenarDirecao === "desc" ? -1 : 1;
  filtrados.sort((a, b) => {
    if (ordenarCampo === "uf") {
      return sinal * (a.siglaUf ?? "").localeCompare(b.siglaUf ?? "", "pt-BR");
    }
    if (ordenarCampo === "autor") {
      const av = idsAutores.has(a.$id) ? 1 : 0;
      const bv = idsAutores.has(b.$id) ? 1 : 0;
      return sinal * (av - bv);
    }
    return sinal * (a.nome ?? "").localeCompare(b.nome ?? "", "pt-BR");
  });

  function ordenarHrefPara(campo: CampoOrdenacao): string {
    const proximaDirecao = ordenarCampo === campo && ordenarDirecao === "asc" ? "desc" : "asc";
    return `/deputados?${buildQuery(params, 1, { ordenar: `${campo}_${proximaDirecao}` })}`;
  }

  const pagina = Math.max(Number(params.pagina) || 1, 1);
  const totalPaginas = Math.max(Math.ceil(filtrados.length / PAGE_SIZE), 1);
  const pagina_ = Math.min(pagina, totalPaginas);
  const pageDeputados = filtrados.slice((pagina_ - 1) * PAGE_SIZE, pagina_ * PAGE_SIZE);

  return (
    <div>
      <PageHeader
        title="Deputados"
        subtitle={
          deputados.length === 0
            ? "Nenhum deputado sincronizado ainda — rode o sync da Câmara (scripts/camara/run.mjs)."
            : `${filtrados.length} de ${deputados.length} deputados · dados públicos da Câmara dos Deputados`
        }
      />

      <div className="px-7">
        <div className="print:hidden">
          <DeputadosFiltros
            partidos={partidosDisponiveis(deputados)}
            ufs={ufsDisponiveis(deputados)}
            defaults={params}
          />
        </div>

        <DeputadosTabela
          deputados={pageDeputados}
          todosParaExportar={filtrados}
          idsAutoresTramitacao={[...idsAutores]}
          ordenarCampo={ordenarCampo}
          ordenarDirecao={ordenarDirecao}
          hrefOrdenarNome={ordenarHrefPara("nome")}
          hrefOrdenarAutor={ordenarHrefPara("autor")}
          hrefOrdenarUf={ordenarHrefPara("uf")}
        />

        {totalPaginas > 1 && (
          <div className="my-4 flex items-center justify-between print:hidden">
            <p className="text-[12px] text-relgov-muted">
              Exibindo {pageDeputados.length} de {filtrados.length} deputados
            </p>
            <div className="flex flex-wrap gap-1.5">
              {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((p) => (
                <Link
                  key={p}
                  href={`/deputados?${buildQuery(params, p)}`}
                  className={`rounded-[5px] px-2.5 py-1 font-mono text-[12px] ${
                    p === pagina_
                      ? "bg-relgov-navy text-white"
                      : "border border-relgov-border-control bg-relgov-surface text-relgov-body"
                  }`}
                >
                  {p}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function buildQuery(
  params: Record<string, string | undefined>,
  pagina: number,
  overrides: Record<string, string> = {}
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value && key !== "pagina") search.set(key, value);
  }
  for (const [key, value] of Object.entries(overrides)) {
    search.set(key, value);
  }
  search.set("pagina", String(pagina));
  return search.toString();
}
