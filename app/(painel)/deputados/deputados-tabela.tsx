"use client";

import Link from "next/link";
import { useState } from "react";

import { PrintTabela } from "@/components/relgov/print-tabela";
import { SelecaoExportarToolbar } from "@/components/relgov/selecao-exportar";
import type { Deputado } from "@/lib/camara/types";
import { baixarPlanilha } from "@/lib/relgov/export";
import { useSelecaoMultipla } from "@/lib/relgov/use-selecao-multipla";

const COLUNAS = [
  "Nome",
  "Autor em Tramitação",
  "Partido",
  "UF",
  "Situação",
  "E-mail",
  "Telefone do gabinete",
  "Gabinete",
  "Perfil",
];

/** Perfil público oficial na Câmara — URL estável a partir do id do deputado. */
function urlPerfil(dep: Deputado): string {
  return `https://www.camara.leg.br/deputados/${dep.camaraId}`;
}

function linhaDeputado(dep: Deputado, ehAutor: boolean): (string | number)[] {
  const gabinete = [
    dep.gabinetePredio ? `Anexo ${dep.gabinetePredio}` : null,
    dep.gabineteSala ? `Sala ${dep.gabineteSala}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  return [
    dep.nome ?? "",
    ehAutor ? "🔘" : "",
    dep.siglaPartido ?? "",
    dep.siglaUf ?? "",
    dep.situacao ?? "",
    dep.email ?? dep.gabineteEmail ?? "",
    dep.gabineteTelefone ?? "",
    gabinete,
    urlPerfil(dep),
  ];
}

function CabecalhoOrdenavel({
  label,
  href,
  ativo,
  direcao,
}: {
  label: string;
  href: string;
  ativo: boolean;
  direcao: "asc" | "desc";
}) {
  return (
    <Link
      href={href}
      className={`relgov-label flex items-center gap-1 text-[10px] hover:text-relgov-navy-light ${
        ativo ? "text-relgov-navy" : "text-relgov-label"
      }`}
      title={
        ativo
          ? `Ordenado ${direcao === "asc" ? "A–Z" : "Z–A"} — clique para inverter`
          : `Ordenar por ${label}`
      }
    >
      {label}
      <span aria-hidden className="text-[12px] normal-case">
        {ativo ? (direcao === "asc" ? "↑" : "↓") : "⇅"}
      </span>
    </Link>
  );
}

export function DeputadosTabela({
  deputados,
  todosParaExportar = deputados,
  idsAutoresTramitacao,
  ordenarCampo,
  ordenarDirecao,
  hrefOrdenarNome,
  hrefOrdenarAutor,
  hrefOrdenarUf,
}: {
  deputados: Deputado[];
  /** Universo exportado quando nada está selecionado — em página paginada, passe a lista filtrada inteira, não só a página atual. */
  todosParaExportar?: Deputado[];
  idsAutoresTramitacao: string[];
  ordenarCampo: "nome" | "autor" | "uf";
  ordenarDirecao: "asc" | "desc";
  hrefOrdenarNome: string;
  hrefOrdenarAutor: string;
  hrefOrdenarUf: string;
}) {
  const { selecionados, alternar, alternarTodos, paraExportar } = useSelecaoMultipla(
    deputados,
    todosParaExportar
  );
  const autores = new Set(idsAutoresTramitacao);

  return (
    <>
      <SelecaoExportarToolbar
        total={deputados.length}
        totalParaExportar={todosParaExportar.length}
        selecionados={selecionados.size}
        onBaixarXlsx={() =>
          baixarPlanilha(
            "deputados",
            COLUNAS,
            paraExportar.map((dep) => linhaDeputado(dep, autores.has(dep.$id)))
          )
        }
      />

      <div className="overflow-x-auto rounded-[9px] border border-relgov-border bg-relgov-surface print:hidden">
        <div className="grid min-w-[900px] grid-cols-[28px_1fr_70px_90px_130px_1fr_150px_110px] items-center gap-3 border-b-2 border-relgov-border px-4 py-3">
          <input
            type="checkbox"
            aria-label="Selecionar todos"
            checked={deputados.length > 0 && selecionados.size === deputados.length}
            onChange={alternarTodos}
            className="h-4 w-4"
          />
          <CabecalhoOrdenavel
            label="Deputado"
            href={hrefOrdenarNome}
            ativo={ordenarCampo === "nome"}
            direcao={ordenarDirecao}
          />
          <CabecalhoOrdenavel
            label="Autor"
            href={hrefOrdenarAutor}
            ativo={ordenarCampo === "autor"}
            direcao={ordenarDirecao}
          />
          <CabecalhoOrdenavel
            label="UF"
            href={hrefOrdenarUf}
            ativo={ordenarCampo === "uf"}
            direcao={ordenarDirecao}
          />
          {["Situação", "Contato", "Gabinete", "Perfil"].map((h) => (
            <span key={h} className="relgov-label text-[10px] text-relgov-label">
              {h}
            </span>
          ))}
        </div>

        {deputados.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-relgov-muted">
            Nenhum deputado encontrado.
          </p>
        )}

        {deputados.map((dep) => (
          <div
            key={dep.$id}
            className="grid min-w-[900px] grid-cols-[28px_1fr_70px_90px_130px_1fr_150px_110px] items-center gap-3 border-b border-relgov-divider-2 px-4 py-3.5 last:border-b-0"
          >
            <input
              type="checkbox"
              aria-label={`Selecionar ${dep.nome ?? ""}`}
              checked={selecionados.has(dep.$id)}
              onChange={() => alternar(dep.$id)}
              className="h-4 w-4"
            />
            <div className="flex min-w-0 items-center gap-3">
              <Avatar nome={dep.nome ?? "?"} urlFoto={dep.urlFoto} />
              <div className="min-w-0">
                <p className="truncate text-[13.5px] font-semibold text-relgov-navy">
                  {dep.nome ?? "—"}
                </p>
                <p className="truncate text-[11.5px] text-relgov-muted">{dep.siglaPartido ?? "—"}</p>
              </div>
            </div>
            <span
              className="text-[15px]"
              title={autores.has(dep.$id) ? "Autor de proposição em Tramitação" : undefined}
            >
              {autores.has(dep.$id) ? "🔘" : ""}
            </span>
            <span className="text-[12.5px] text-relgov-secondary">{dep.siglaUf ?? "—"}</span>
            <span className="truncate text-[12px] text-relgov-secondary">{dep.situacao ?? "—"}</span>
            <div className="min-w-0 text-[12px] text-relgov-secondary">
              {dep.email || dep.gabineteEmail ? (
                <a
                  href={`mailto:${dep.email || dep.gabineteEmail}`}
                  className="block truncate text-relgov-navy-light hover:underline"
                >
                  {dep.email || dep.gabineteEmail}
                </a>
              ) : (
                <span>—</span>
              )}
              {dep.gabineteTelefone && <p className="truncate">{dep.gabineteTelefone}</p>}
            </div>
            <div className="min-w-0 text-[11.5px] text-relgov-muted">
              {dep.gabinetePredio || dep.gabineteSala ? (
                <>
                  {dep.gabinetePredio && <p className="truncate">Anexo {dep.gabinetePredio}</p>}
                  {dep.gabineteSala && (
                    <p className="truncate">
                      Sala {dep.gabineteSala}
                      {dep.gabineteAndar ? ` · ${dep.gabineteAndar}º andar` : ""}
                    </p>
                  )}
                </>
              ) : (
                <span>—</span>
              )}
            </div>
            <a
              href={urlPerfil(dep)}
              target="_blank"
              rel="noreferrer"
              className="truncate text-[12px] text-relgov-navy-light underline"
            >
              Ver perfil ↗
            </a>
          </div>
        ))}
      </div>

      <PrintTabela
        titulo="Deputados"
        colunas={COLUNAS}
        linhas={paraExportar.map((dep) => linhaDeputado(dep, autores.has(dep.$id)))}
      />
    </>
  );
}

function Avatar({ nome, urlFoto }: { nome: string; urlFoto: string | null }) {
  const [falhou, setFalhou] = useState(false);

  if (urlFoto && !falhou) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- foto externa (camara.leg.br), sem otimização do next/image
      <img
        src={urlFoto}
        alt={nome}
        className="h-9 w-9 shrink-0 rounded-full object-cover"
        loading="lazy"
        onError={() => setFalhou(true)}
      />
    );
  }
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-relgov-navy-light text-xs font-semibold text-relgov-gold">
      {nome.charAt(0).toUpperCase()}
    </span>
  );
}
