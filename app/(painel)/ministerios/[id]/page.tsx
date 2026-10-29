import { notFound } from "next/navigation";
import { AppwriteException } from "node-appwrite";

import { requireSession } from "@/lib/auth";
import { canRegistrarMovimentacao } from "@/lib/permissions";
import { formatDateBR } from "@/lib/relgov/derived";
import {
  getDirecaoMinisterio,
  listAnexosProjetos,
  listProjetosMinisterio,
  listResponsaveisProjetos,
} from "@/lib/ministerios/data";
import { SIORG_TABLES } from "@/lib/appwrite/constants";
import { getEnderecoContato, getUnidade, listDominio, listSubordinadasDiretas } from "@/lib/siorg/data";
import { buscarDirecaoMinisterio } from "@/lib/siorg/direcao";
import { AnexoProjetoItem } from "../anexo-projeto-item";
import { DirecaoForm } from "../direcao-form";
import { NovoProjetoForm } from "../novo-projeto-form";

export default async function MinisterioDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user, tablesDB } = await requireSession();

  const ministerio = await getUnidade(tablesDB, id).catch((err) => {
    if (err instanceof AppwriteException && err.code === 404) notFound();
    throw err;
  });

  const [naturezas, categorias, subordinadas, projetos, direcaoManual, enderecoContato] = await Promise.all([
    listDominio(tablesDB, SIORG_TABLES.naturezaJuridica),
    listDominio(tablesDB, SIORG_TABLES.categoriaUnidade),
    listSubordinadasDiretas(tablesDB, id),
    listProjetosMinisterio(tablesDB, id),
    getDirecaoMinisterio(tablesDB, id),
    getEnderecoContato(tablesDB, id),
  ]);
  const naturezaPorId = new Map(naturezas.map((n) => [n.$id, n.descricao]));
  const categoriaPorId = new Map(categorias.map((c) => [c.$id, c.descricao]));
  const direcaoSiorg = await buscarDirecaoMinisterio(ministerio, subordinadas);

  const projetoIds = projetos.map((p) => p.$id);
  const [responsaveis, anexos] = await Promise.all([
    listResponsaveisProjetos(tablesDB, projetoIds),
    listAnexosProjetos(tablesDB, projetoIds),
  ]);
  const responsaveisDoProjeto = (projetoId: string) =>
    responsaveis.filter((r) => r.projetoId === projetoId);
  const anexosDoProjeto = (projetoId: string) => anexos.filter((a) => a.projetoId === projetoId);

  const podeCriar = canRegistrarMovimentacao(user.role);

  const telefones: string[] = enderecoContato?.telefonesJson ? JSON.parse(enderecoContato.telefonesJson) : [];
  const emails: string[] = enderecoContato?.emailsJson ? JSON.parse(enderecoContato.emailsJson) : [];
  const sites: { tipo: string | null; site: string | null }[] = enderecoContato?.siteJson
    ? JSON.parse(enderecoContato.siteJson)
    : [];
  const enderecoFormatado = enderecoContato
    ? [
        enderecoContato.logradouro,
        enderecoContato.numero && enderecoContato.numero !== "0" ? enderecoContato.numero : null,
        enderecoContato.bairro,
        enderecoContato.uf,
      ]
        .filter(Boolean)
        .join(", ")
    : null;

  return (
    <div>
      <div className="sticky top-0 z-10 bg-relgov-navy px-[26px] py-[22px]">
        <p className="relgov-label text-[10px] text-white/50">Ministérios</p>
        <h1 className="mt-2 max-w-[640px] font-display text-[25px] font-semibold leading-[1.25] text-white">
          {ministerio.nome}
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-2.5 text-[11.5px] text-white/70">
          {ministerio.sigla && (
            <span className="rounded-[5px] bg-white/[.14] px-2 py-0.5 font-medium text-white">
              {ministerio.sigla}
            </span>
          )}
          {ministerio.naturezaRef && naturezaPorId.get(ministerio.naturezaRef) && (
            <span>{naturezaPorId.get(ministerio.naturezaRef)}</span>
          )}
          {ministerio.categoriaRef && categoriaPorId.get(ministerio.categoriaRef) && (
            <span>· {categoriaPorId.get(ministerio.categoriaRef)}</span>
          )}
          <span>· {subordinadas.length} unidade(s) subordinada(s)</span>
        </div>
      </div>

      <div className="px-[26px] py-6">
        <DirecaoForm
          ministerioId={ministerio.$id}
          direcaoSiorg={direcaoSiorg}
          direcaoManual={direcaoManual}
          editable={podeCriar}
        />

        {enderecoContato && (enderecoFormatado || telefones.length > 0 || emails.length > 0 || sites.length > 0) && (
          <div className="mt-4 rounded-[9px] border border-relgov-border bg-relgov-surface p-4">
            <p className="relgov-label text-[9.5px]">Endereço e contato (SIORG)</p>
            <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-relgov-body">
              {enderecoFormatado && <span>{enderecoFormatado}</span>}
              {enderecoContato.cep && <span className="text-relgov-muted">CEP {enderecoContato.cep}</span>}
              {telefones.map((tel) => (
                <span key={tel}>{tel}</span>
              ))}
              {emails.map((email) => (
                <a key={email} href={`mailto:${email}`} className="text-relgov-navy-light underline">
                  {email}
                </a>
              ))}
              {sites.map(
                (s) =>
                  s.site && (
                    <a
                      key={s.site}
                      href={s.site.startsWith("http") ? s.site : `https://${s.site}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-relgov-navy-light underline"
                    >
                      {s.site}
                    </a>
                  )
              )}
            </div>
          </div>
        )}

        <div className="mt-6 flex items-center justify-between">
          <h2 className="font-display text-[16px] font-semibold text-relgov-navy">Projetos</h2>
          {podeCriar && (
            <NovoProjetoForm ministerioId={ministerio.$id} ministerioNome={ministerio.nome} />
          )}
        </div>

        {projetos.length === 0 && (
          <p className="mt-3 text-[13px] text-relgov-muted">
            Nenhum projeto cadastrado para este ministério ainda.
          </p>
        )}

        <div className="mt-4 flex flex-col gap-3">
          {projetos.map((projeto) => (
            <div
              key={projeto.$id}
              className="rounded-[9px] border border-relgov-border bg-relgov-surface p-4"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-[14px] font-semibold text-relgov-navy">{projeto.titulo}</h3>
                <div className="flex items-center gap-3">
                  {projeto.data && (
                    <span className="text-[11.5px] text-relgov-muted">
                      {formatDateBR(projeto.data)}
                    </span>
                  )}
                  {projeto.link && (
                    <a
                      href={projeto.link}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11.5px] text-relgov-navy-light underline"
                    >
                      Link ↗
                    </a>
                  )}
                </div>
              </div>

              {projeto.contexto && (
                <p className="mt-2 text-[12.5px] leading-relaxed text-relgov-secondary">
                  {projeto.contexto}
                </p>
              )}

              {responsaveisDoProjeto(projeto.$id).length > 0 && (
                <div className="mt-3">
                  <p className="relgov-label text-[9.5px]">Responsável(is)</p>
                  <div className="mt-1.5 flex flex-wrap gap-2">
                    {responsaveisDoProjeto(projeto.$id).map((r) => (
                      <span
                        key={r.$id}
                        className="rounded-[7px] border border-relgov-border bg-relgov-surface-subtle px-2.5 py-1.5 text-[12px] text-relgov-body"
                      >
                        <span className="font-medium">{r.nome}</span>
                        {r.telefone && <span className="text-relgov-muted"> · {r.telefone}</span>}
                        {r.email && (
                          <>
                            {" "}
                            ·{" "}
                            <a href={`mailto:${r.email}`} className="text-relgov-navy-light underline">
                              {r.email}
                            </a>
                          </>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {anexosDoProjeto(projeto.$id).length > 0 && (
                <div className="mt-3 flex flex-col gap-1.5">
                  <p className="relgov-label text-[9.5px]">Anexos</p>
                  {anexosDoProjeto(projeto.$id).map((anexo) => (
                    <AnexoProjetoItem
                      key={anexo.$id}
                      anexo={anexo}
                      ministerioId={ministerio.$id}
                      editable={podeCriar}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
