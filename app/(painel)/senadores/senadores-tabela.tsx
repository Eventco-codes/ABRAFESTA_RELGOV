"use client";

import { PrintTabela } from "@/components/relgov/print-tabela";
import { SelecaoExportarToolbar } from "@/components/relgov/selecao-exportar";
import type { Senador } from "@/lib/senado/data";
import { baixarPlanilha } from "@/lib/relgov/export";
import { useSelecaoMultipla } from "@/lib/relgov/use-selecao-multipla";
import { Avatar } from "./avatar";

const COLUNAS = ["Nome", "Partido", "UF", "E-mail", "Telefone", "Página oficial"];

function linhaSenador(s: Senador): (string | number)[] {
  return [
    `${s.formaTratamento ? `${s.formaTratamento} ` : ""}${s.nome ?? ""}`,
    s.partido ?? "",
    s.uf ?? "",
    s.email ?? "",
    s.telefone ?? "",
    s.urlPagina ?? "",
  ];
}

export function SenadoresTabela({ senadores }: { senadores: Senador[] }) {
  const { selecionados, alternar, alternarTodos, paraExportar } = useSelecaoMultipla(senadores);

  return (
    <>
      <SelecaoExportarToolbar
        total={senadores.length}
        selecionados={selecionados.size}
        onBaixarXlsx={() => baixarPlanilha("senadores", COLUNAS, paraExportar.map(linhaSenador))}
      />

      <div className="overflow-hidden rounded-[9px] border border-relgov-border bg-relgov-surface print:hidden">
        <div className="grid grid-cols-[28px_1fr_70px_1fr_150px] items-center gap-3 border-b-2 border-relgov-border px-4 py-3">
          <input
            type="checkbox"
            aria-label="Selecionar todos"
            checked={senadores.length > 0 && selecionados.size === senadores.length}
            onChange={alternarTodos}
            className="h-4 w-4"
          />
          {["Senador(a)", "UF", "Contato", "Página oficial"].map((h) => (
            <span key={h} className="relgov-label text-[10px] text-relgov-label">
              {h}
            </span>
          ))}
        </div>

        {senadores.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-relgov-muted">
            Nenhum senador encontrado.
          </p>
        )}

        {senadores.map((s) => (
          <div
            key={s.$id}
            className="grid grid-cols-[28px_1fr_70px_1fr_150px] items-center gap-3 border-b border-relgov-divider-2 px-4 py-3.5 last:border-b-0"
          >
            <input
              type="checkbox"
              aria-label={`Selecionar ${s.nome ?? ""}`}
              checked={selecionados.has(s.$id)}
              onChange={() => alternar(s.$id)}
              className="h-4 w-4"
            />
            <div className="flex min-w-0 items-center gap-3">
              <Avatar nome={s.nome ?? "?"} urlFoto={s.urlFoto} />
              <div className="min-w-0">
                <p className="truncate text-[13.5px] font-semibold text-relgov-navy">
                  {s.formaTratamento ? `${s.formaTratamento} ` : ""}
                  {s.nome ?? "—"}
                </p>
                <p className="truncate text-[11.5px] text-relgov-muted">{s.partido ?? "—"}</p>
              </div>
            </div>
            <span className="text-[12.5px] text-relgov-secondary">{s.uf ?? "—"}</span>
            <div className="min-w-0 text-[12px] text-relgov-secondary">
              {s.email ? (
                <a
                  href={`mailto:${s.email}`}
                  className="block truncate text-relgov-navy-light hover:underline"
                >
                  {s.email}
                </a>
              ) : (
                <span>—</span>
              )}
              {s.telefone && <p className="truncate">{s.telefone}</p>}
            </div>
            {s.urlPagina ? (
              <a
                href={s.urlPagina}
                target="_blank"
                rel="noreferrer"
                className="truncate text-[12px] text-relgov-navy-light underline"
              >
                Ver perfil ↗
              </a>
            ) : (
              <span className="text-[12px] text-relgov-muted">—</span>
            )}
          </div>
        ))}
      </div>

      <PrintTabela titulo="Senadores" colunas={COLUNAS} linhas={paraExportar.map(linhaSenador)} />
    </>
  );
}
