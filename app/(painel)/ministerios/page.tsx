import Link from "next/link";

import { PageHeader } from "@/components/relgov/page-header";
import { requireSession } from "@/lib/auth";
import { formatDateBR } from "@/lib/relgov/derived";
import { SIORG_TABLES } from "@/lib/appwrite/constants";
import { contarSubordinadas, getSyncMeta, listDominio, listOrgaosEntidades } from "@/lib/siorg/data";
import { filtrarMinisterios } from "@/lib/siorg/filters";
import { MinisteriosFiltros } from "./ministerios-filtros";

function normaliza(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

export default async function MinisteriosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const { tablesDB } = await requireSession();

  const [orgaos, naturezas, categorias, syncMeta] = await Promise.all([
    listOrgaosEntidades(tablesDB),
    listDominio(tablesDB, SIORG_TABLES.naturezaJuridica),
    listDominio(tablesDB, SIORG_TABLES.categoriaUnidade),
    getSyncMeta(tablesDB, "orgao_entidade"),
  ]);

  const naturezaPorId = new Map(naturezas.map((n) => [n.$id, n.descricao]));
  const categoriaPorId = new Map(categorias.map((c) => [c.$id, c.descricao]));

  const todosMinisterios = filtrarMinisterios(orgaos).sort((a, b) => a.nome.localeCompare(b.nome));

  const busca = params.busca ? normaliza(params.busca) : null;
  const ministerios = busca
    ? todosMinisterios.filter((m) => normaliza(`${m.nome} ${m.sigla ?? ""}`).includes(busca))
    : todosMinisterios;

  const comSubordinadas = await Promise.all(
    ministerios.map(async (m) => ({
      ministerio: m,
      subordinadas: await contarSubordinadas(tablesDB, m.$id),
    }))
  );

  return (
    <div>
      <PageHeader
        title="Ministérios"
        subtitle={
          orgaos.length === 0
            ? "Nenhum dado sincronizado ainda — rode a sincronização do SIORG (POST /api/siorg/sync?mode=full)."
            : `${ministerios.length} de ${todosMinisterios.length} ministérios · estrutura organizacional do governo federal (SIORG)${
                syncMeta?.ultimoSyncEm
                  ? ` · última sincronização em ${formatDateBR(syncMeta.ultimoSyncEm)}`
                  : ""
              }`
        }
      />

      <div className="px-7">
        <MinisteriosFiltros defaults={params} />

        <div className="overflow-hidden rounded-[9px] border border-relgov-border bg-relgov-surface">
          <div className="grid grid-cols-[1fr_110px_1fr_1fr_140px] gap-3 border-b-2 border-relgov-border px-4 py-3">
            {["Ministério", "Sigla", "Natureza jurídica", "Categoria", "Unidades subordinadas"].map(
              (h) => (
                <span key={h} className="relgov-label text-[10px] text-relgov-label">
                  {h}
                </span>
              )
            )}
          </div>

          {comSubordinadas.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-relgov-muted">
              Nenhum ministério encontrado.
            </p>
          )}

          {comSubordinadas.map(({ ministerio, subordinadas }) => (
            <Link
              key={ministerio.$id}
              href={`/ministerios/${ministerio.$id}`}
              className="grid grid-cols-[1fr_110px_1fr_1fr_140px] items-center gap-3 border-b border-relgov-divider-2 px-4 py-3.5 last:border-b-0 hover:bg-relgov-surface-subtle-2"
            >
              <p className="truncate text-[13.5px] font-semibold text-relgov-navy">
                {ministerio.nome}
              </p>
              <span className="text-[12.5px] text-relgov-secondary">{ministerio.sigla ?? "—"}</span>
              <span className="truncate text-[12.5px] text-relgov-secondary">
                {(ministerio.naturezaRef && naturezaPorId.get(ministerio.naturezaRef)) ?? "—"}
              </span>
              <span className="truncate text-[12.5px] text-relgov-secondary">
                {(ministerio.categoriaRef && categoriaPorId.get(ministerio.categoriaRef)) ?? "—"}
              </span>
              <span className="font-mono text-[12.5px] text-relgov-muted">{subordinadas}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
