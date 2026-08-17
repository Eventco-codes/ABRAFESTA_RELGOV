import Link from "next/link";

import { PageHeader } from "@/components/relgov/page-header";
import { PrimaryLinkButton, SecondaryLinkButton } from "@/components/relgov/buttons";
import { PrioridadePill } from "@/components/relgov/tags";
import { requireSession } from "@/lib/auth";
import { canManagePendencias } from "@/lib/permissions";
import { listPautas, listPendencias } from "@/lib/relgov/data";
import { diasAtraso, formatDateBR, isVencido, pendenciasAbertas, pendenciasVencidas } from "@/lib/relgov/derived";
import { PendenciasFiltro } from "./pendencias-filtro";

export default async function PendenciasPage({
  searchParams,
}: {
  searchParams: Promise<{ filtro?: string }>;
}) {
  const { filtro = "vencidas" } = await searchParams;
  const { user, tablesDB } = await requireSession();
  const [pendencias, pautas] = await Promise.all([listPendencias(tablesDB), listPautas(tablesDB)]);
  const tituloPorPauta = new Map(pautas.map((p) => [p.$id, p.titulo]));

  const abertas = pendenciasAbertas(pendencias);
  const vencidas = pendenciasVencidas(pendencias);

  const listaBase = filtro === "todas" ? pendencias : filtro === "abertas" ? abertas : vencidas;
  const lista = [...listaBase].sort((a, b) => diasAtraso(b.prazoSugerido) - diasAtraso(a.prazoSugerido));

  const podeGerenciar = canManagePendencias(user.role);

  return (
    <div>
      <PageHeader
        title="Pendências e cobranças"
        subtitle={`${abertas.length} abertas · ${vencidas.length} com prazo vencido`}
        actions={
          podeGerenciar ? (
            <>
              <SecondaryLinkButton href="/pendencias/nova">+ Nova pendência</SecondaryLinkButton>
              <PrimaryLinkButton href="/pendencias/cobrancas">Gerar cobranças</PrimaryLinkButton>
            </>
          ) : undefined
        }
      />

      <div className="px-7 py-4">
        <PendenciasFiltro defaultValue={filtro} />

        <div className="overflow-x-auto rounded-[9px] border border-relgov-border bg-relgov-surface">
          <div className="grid min-w-[820px] grid-cols-[1.3fr_170px_150px_92px_118px_1fr] gap-3 border-b-2 border-relgov-border px-4 py-3">
            {["Pauta", "Responsável", "Status", "Prioridade", "Prazo", "Próxima cobrança"].map(
              (h) => (
                <span key={h} className="relgov-label text-[10px] text-relgov-label">
                  {h}
                </span>
              )
            )}
          </div>

          {lista.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-relgov-muted">
              Sem prazos vencidos.
            </p>
          )}

          {lista.map((p) => {
            const vencida = isVencido(p);
            return (
              <Link
                key={p.$id}
                href={podeGerenciar ? `/pendencias/${p.$id}/editar` : "#"}
                className={`grid min-w-[820px] grid-cols-[1.3fr_170px_150px_92px_118px_1fr] items-center gap-3 border-b border-relgov-divider-2 px-4 py-3.5 last:border-b-0 ${vencida ? "bg-relgov-danger-bg" : ""} hover:bg-relgov-surface-subtle-2`}
              >
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-relgov-body">
                    {p.pautaId
                      ? (tituloPorPauta.get(p.pautaId) ?? "Pauta")
                      : "— institucional —"}
                  </p>
                  <p className="truncate text-[11.5px] text-relgov-muted">{p.descricao}</p>
                </div>
                <span className="truncate text-[12.5px] text-relgov-secondary">
                  {p.responsavel}
                </span>
                <span className="truncate text-[12.5px] text-relgov-secondary">{p.status}</span>
                <span>
                  <PrioridadePill prioridade={p.prioridade} />
                </span>
                <div>
                  <p
                    className={`font-mono text-[11px] font-semibold ${vencida ? "text-relgov-danger" : "text-relgov-muted"}`}
                  >
                    {formatDateBR(p.prazoSugerido)}
                  </p>
                  {vencida && (
                    <p className="text-[11px] text-relgov-danger">
                      {diasAtraso(p.prazoSugerido)}d de atraso
                    </p>
                  )}
                </div>
                <span className="truncate text-[12px] text-relgov-muted">
                  {p.proximaCobranca}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
