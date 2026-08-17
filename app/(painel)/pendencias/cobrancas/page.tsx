import { PageHeader } from "@/components/relgov/page-header";
import { SecondaryLinkButton } from "@/components/relgov/buttons";
import { requireRole } from "@/lib/auth";
import { listPautas, listPendencias } from "@/lib/relgov/data";
import { diasAtraso, formatDateBR, pendenciasVencidas } from "@/lib/relgov/derived";

export default async function GerarCobrancasPage() {
  const { tablesDB } = await requireRole("administrador", "coordenador_relgov");
  const [pendencias, pautas] = await Promise.all([listPendencias(tablesDB), listPautas(tablesDB)]);
  const tituloPorPauta = new Map(pautas.map((p) => [p.$id, p.titulo]));
  const vencidas = pendenciasVencidas(pendencias);

  const porResponsavel = new Map<string, typeof vencidas>();
  for (const p of vencidas) {
    const lista = porResponsavel.get(p.responsavel) ?? [];
    lista.push(p);
    porResponsavel.set(p.responsavel, lista);
  }

  return (
    <div>
      <PageHeader
        title="Gerar cobranças"
        subtitle="Rascunhos agrupados por responsável — copie o texto e envie pelo seu canal de e-mail."
        actions={<SecondaryLinkButton href="/pendencias">Voltar</SecondaryLinkButton>}
      />
      <div className="flex flex-col gap-4 px-7 py-6">
        {porResponsavel.size === 0 && (
          <p className="text-sm text-relgov-muted">Nenhuma pendência vencida no momento.</p>
        )}
        {[...porResponsavel.entries()].map(([responsavel, itens]) => {
          const corpo = itens
            .map(
              (p) =>
                `- ${p.pautaId ? (tituloPorPauta.get(p.pautaId) ?? "Pauta") : "Institucional"}: ${p.descricao} (prazo ${formatDateBR(
                  p.prazoSugerido
                )}, ${diasAtraso(p.prazoSugerido)} dias de atraso). Próxima cobrança: ${p.proximaCobranca}`
            )
            .join("\n");
          const texto = `Assunto: RelGov ABRAFESTA · pendências em atraso\n\nOlá, ${responsavel},\n\nSeguem as pendências em atraso sob sua responsabilidade:\n\n${corpo}\n\nAtenciosamente,\nEquipe RelGov`;

          return (
            <div
              key={responsavel}
              className="rounded-lg border border-relgov-border bg-relgov-surface p-4"
            >
              <p className="text-[13px] font-semibold text-relgov-navy">{responsavel}</p>
              <p className="mt-0.5 text-[11.5px] text-relgov-muted">
                {itens.length} pendência(s) em atraso
              </p>
              <textarea
                readOnly
                value={texto}
                rows={6}
                className="mt-3 w-full rounded-[7px] border border-relgov-border-control bg-relgov-surface-subtle px-3 py-2 font-mono text-[12px] text-relgov-body"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
