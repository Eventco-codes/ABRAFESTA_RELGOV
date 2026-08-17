import Link from "next/link";
import { notFound } from "next/navigation";
import { AppwriteException } from "node-appwrite";

import { PrioridadePill } from "@/components/relgov/tags";
import { SecondaryLinkButton, PrimaryLinkButton } from "@/components/relgov/buttons";
import { requireSession } from "@/lib/auth";
import { canManagePautas, canRegistrarMovimentacao } from "@/lib/permissions";
import { getPauta, listEncaminhamentos, listMovimentacoes, listPendencias } from "@/lib/relgov/data";
import { formatDateBR, isVencido } from "@/lib/relgov/derived";
import { EncaminhamentoItem } from "./encaminhamento-item";
import { MovimentacaoForm } from "./movimentacao-form";
import { ToggleAtivoButton } from "./toggle-ativo-button";

const MARCADOR_ORIGEM: Record<string, string> = {
  VARREDURA_AUTOMATICA: "bg-relgov-gold",
  REGISTRO_MANUAL: "bg-relgov-navy",
};

export default async function FichaPautaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user, tablesDB } = await requireSession();

  const pauta = await getPauta(tablesDB, id).catch((err) => {
    if (err instanceof AppwriteException && err.code === 404) notFound();
    throw err;
  });

  const [encaminhamentos, movimentacoes, pendencias] = await Promise.all([
    listEncaminhamentos(tablesDB, id),
    listMovimentacoes(tablesDB, id),
    listPendencias(tablesDB, { pautaId: id }),
  ]);

  const podeGerenciarPauta = canManagePautas(user.role);
  const podeRegistrar = canRegistrarMovimentacao(user.role);

  return (
    <div>
      <div className="bg-relgov-navy px-[26px] py-[22px]">
        <p className="relgov-label text-[10px] text-white/50">Pautas / {pauta.eixo}</p>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
          <h1 className="max-w-[640px] font-display text-[25px] font-semibold leading-[1.25] text-white">
            {pauta.titulo}
          </h1>
          <div className="flex gap-2.5">
            {podeGerenciarPauta && (
              <>
                <ToggleAtivoButton pautaId={pauta.$id} ativo={pauta.ativo} />
                <PrimaryLinkButton href={`/pautas/${pauta.$id}/editar`}>
                  Editar pauta
                </PrimaryLinkButton>
              </>
            )}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2.5">
          <PrioridadePill prioridade={pauta.prioridade} />
          <span className="rounded-[5px] bg-white/[.14] px-2 py-0.5 text-[11px] font-medium text-white">
            {pauta.status}
          </span>
          {!pauta.ativo && (
            <span className="rounded-[5px] bg-white/[.14] px-2 py-0.5 text-[11px] font-medium text-white">
              Desativada
            </span>
          )}
          <span className="text-[11.5px] text-white/60">
            Atualizado em {formatDateBR(pauta.$updatedAt)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px]">
        <div className="px-[26px] py-6">
          <Label>Atuação</Label>
          <p className="mt-1 text-[14px] leading-relaxed text-relgov-dense">{pauta.atuacao}</p>

          <div className="mt-[22px] grid grid-cols-1 gap-[22px] sm:grid-cols-2">
            <div>
              <Label>Contexto</Label>
              <p className="mt-1 text-[13px] leading-relaxed text-relgov-secondary">
                {pauta.contexto}
              </p>
            </div>
            <div>
              <Label>Situação atual</Label>
              <p className="mt-1 text-[13px] leading-relaxed text-relgov-secondary">
                {pauta.situacaoAtual}
              </p>
            </div>
          </div>

          <div className="mt-[22px]">
            <Label>Interlocutores</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {pauta.interlocutores.split(";").map((nome) => (
                <span
                  key={nome}
                  className="rounded-[14px] border border-relgov-border bg-relgov-surface px-2.5 py-1 text-[12.5px] text-relgov-body"
                >
                  {nome.trim()}
                </span>
              ))}
            </div>
          </div>

          {encaminhamentos.length > 0 && (
            <div className="mt-[22px] rounded-lg border border-relgov-border bg-relgov-surface p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-relgov-gold">
                Próximos encaminhamentos
              </p>
              <div className="mt-2 flex flex-col">
                {encaminhamentos.map((item) => (
                  <EncaminhamentoItem
                    key={item.$id}
                    pautaId={pauta.$id}
                    encaminhamento={item}
                    editable={podeRegistrar}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="mt-[22px] flex flex-wrap gap-x-6 gap-y-1 text-[11.5px] text-relgov-muted">
            <span>Fonte / referência: {pauta.fonteReferencia}</span>
            {pauta.linkOficial && (
              <a
                href={pauta.linkOficial}
                target="_blank"
                rel="noreferrer"
                className="text-relgov-navy-light underline"
              >
                Link oficial monitorado
              </a>
            )}
          </div>
        </div>

        <aside className="border-t border-relgov-border bg-relgov-surface px-5 py-[22px] lg:border-l lg:border-t-0">
          <p className="relgov-label text-[10px]">Histórico de monitoramento</p>
          <ol className="mt-3 flex flex-col gap-[18px] border-l border-relgov-border pl-4">
            {movimentacoes.length === 0 && (
              <p className="text-[12px] text-relgov-muted">Nenhuma movimentação registrada.</p>
            )}
            {movimentacoes.map((mov, index) => (
              <li key={mov.$id} className="relative">
                <span
                  className={`absolute -left-[21px] top-1 h-2 w-2 rounded-full ${index === 0 ? "bg-relgov-gold" : MARCADOR_ORIGEM[mov.origem]}`}
                />
                <p className="font-mono text-[11px] text-relgov-muted">
                  {formatDateBR(mov.data)}
                </p>
                <p className="text-[12.5px] font-medium text-relgov-body">{mov.titulo}</p>
                <p className="text-[11.5px] text-relgov-muted">{mov.descricao}</p>
              </li>
            ))}
          </ol>

          {podeRegistrar && (
            <div className="mt-4">
              <MovimentacaoForm pautaId={pauta.$id} />
            </div>
          )}

          <p className="relgov-label mt-6 text-[10px]">Pendências vinculadas</p>
          <div className="mt-2 flex flex-col gap-2">
            {pendencias.length === 0 && (
              <p className="text-[12px] text-relgov-muted">Nenhuma pendência vinculada.</p>
            )}
            {pendencias.map((p) => (
              <Link
                key={p.$id}
                href="/pendencias"
                className="rounded-[7px] bg-relgov-surface-subtle px-3 py-2.5 hover:bg-relgov-surface-subtle-2"
              >
                <p className="text-[12.5px] font-medium text-relgov-body">{p.descricao}</p>
                <p
                  className={`text-[11.5px] ${isVencido(p) ? "text-relgov-danger" : "text-relgov-muted"}`}
                >
                  prazo {formatDateBR(p.prazoSugerido)}
                </p>
              </Link>
            ))}
          </div>
          {podeRegistrar && (
            <div className="mt-2">
              <SecondaryLinkButton href={`/pendencias/nova?pautaId=${pauta.$id}`} className="block w-full text-center">
                + Adicionar pendência
              </SecondaryLinkButton>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="relgov-label text-[10px]">{children}</p>;
}
