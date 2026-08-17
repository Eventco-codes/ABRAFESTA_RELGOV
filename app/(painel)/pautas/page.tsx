import Link from "next/link";

import { PageHeader } from "@/components/relgov/page-header";
import { PrimaryLinkButton } from "@/components/relgov/buttons";
import { PrioridadePill, StatusTag } from "@/components/relgov/tags";
import { requireSession } from "@/lib/auth";
import { canManagePautas } from "@/lib/permissions";
import { listPautas } from "@/lib/relgov/data";
import { formatDateBR } from "@/lib/relgov/derived";
import { eixosDisponiveis, filtrarPautas, statusDisponiveis } from "@/lib/relgov/filters";
import { PautasFiltros } from "./pautas-filtros";

const PAGE_SIZE = 8;

export default async function PautasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const { user, tablesDB } = await requireSession();
  const pautas = await listPautas(tablesDB);

  const filtradas = filtrarPautas(pautas, {
    busca: params.busca,
    prioridade: params.prioridade,
    eixo: params.eixo,
    status: params.status,
    ativas: (params.ativas as "ativas" | "desativadas" | "todas") ?? "ativas",
  }).sort((a, b) => a.titulo.localeCompare(b.titulo));

  const pagina = Math.max(Number(params.pagina) || 1, 1);
  const totalPaginas = Math.max(Math.ceil(filtradas.length / PAGE_SIZE), 1);
  const pagina_ = Math.min(pagina, totalPaginas);
  const pagePautas = filtradas.slice((pagina_ - 1) * PAGE_SIZE, pagina_ * PAGE_SIZE);

  return (
    <div>
      <PageHeader
        title="Pautas"
        subtitle={`${filtradas.length} de ${pautas.length} pautas`}
        actions={
          canManagePautas(user.role) ? (
            <PrimaryLinkButton href="/pautas/nova">+ Nova pauta</PrimaryLinkButton>
          ) : undefined
        }
      />

      <div className="px-7">
        <PautasFiltros
          eixos={eixosDisponiveis(pautas)}
          statuses={statusDisponiveis(pautas)}
          defaults={params}
        />

        <div className="overflow-hidden rounded-[9px] border border-relgov-border bg-relgov-surface">
          <div className="grid grid-cols-[1fr_190px_96px_150px_150px_28px] gap-3 border-b-2 border-relgov-border px-4 py-3">
            {["Pauta", "Eixo", "Prioridade", "Status", "Atualizado", ""].map((h) => (
              <span key={h} className="relgov-label text-[10px] text-relgov-label">
                {h}
              </span>
            ))}
          </div>

          {pagePautas.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-relgov-muted">
              Nenhuma pauta encontrada.
            </p>
          )}

          {pagePautas.map((pauta) => (
            <Link
              key={pauta.$id}
              href={`/pautas/${pauta.$id}`}
              className="grid grid-cols-[1fr_190px_96px_150px_150px_28px] items-center gap-3 border-b border-relgov-divider-2 px-4 py-3.5 last:border-b-0 hover:bg-relgov-surface-subtle-2"
            >
              <div className="min-w-0">
                <p className="truncate text-[13.5px] font-semibold text-relgov-navy">
                  {pauta.titulo}
                </p>
                <p className="truncate text-[11.5px] text-relgov-muted">
                  {pauta.interlocutores}
                </p>
              </div>
              <span className="truncate text-[12.5px] text-relgov-secondary">{pauta.eixo}</span>
              <span>
                <PrioridadePill prioridade={pauta.prioridade} />
              </span>
              <span>
                <StatusTag status={pauta.status} />
              </span>
              <span className="text-[12px] text-relgov-muted">
                {formatDateBR(pauta.$updatedAt)}
              </span>
              <span className="text-relgov-placeholder">›</span>
            </Link>
          ))}
        </div>

        {totalPaginas > 1 && (
          <div className="my-4 flex items-center justify-between">
            <p className="text-[12px] text-relgov-muted">
              Exibindo {pagePautas.length} de {filtradas.length} pautas
            </p>
            <div className="flex gap-1.5">
              {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((p) => (
                <Link
                  key={p}
                  href={`/pautas?${buildQuery(params, p)}`}
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

function buildQuery(params: Record<string, string | undefined>, pagina: number): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value && key !== "pagina") search.set(key, value);
  }
  search.set("pagina", String(pagina));
  return search.toString();
}
