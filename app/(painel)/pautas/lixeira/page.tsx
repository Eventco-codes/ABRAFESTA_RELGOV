import Link from "next/link";

import { PageHeader } from "@/components/relgov/page-header";
import { requireRole } from "@/lib/auth";
import { listPautasExcluidas, purgarPautasExcluidasVencidas } from "@/lib/relgov/data";
import { formatDateBR } from "@/lib/relgov/derived";
import { ExcluirAgoraButton } from "./excluir-agora-button";
import { RestaurarButton } from "./restaurar-button";

const DIAS_RETENCAO = 30;

function diasRestantes(excluidoEm: string): number {
  const decorridos = (Date.now() - new Date(excluidoEm).getTime()) / (24 * 60 * 60 * 1000);
  return Math.max(Math.ceil(DIAS_RETENCAO - decorridos), 0);
}

export default async function LixeiraPage() {
  const { tablesDB, storage } = await requireRole("administrador");

  // Aplica a exclusão definitiva de quem já passou dos 30 dias antes de listar.
  await purgarPautasExcluidasVencidas(tablesDB, storage);
  const pautas = await listPautasExcluidas(tablesDB);

  return (
    <div>
      <PageHeader
        title="Lixeira"
        subtitle={`${pautas.length} pauta(s) excluída(s) — apagadas em definitivo do banco 30 dias após a exclusão.`}
      />
      <div className="px-7 py-6">
        <Link href="/pautas" className="text-[12.5px] text-relgov-navy-light hover:underline">
          ← Voltar para Pautas
        </Link>

        <div className="mt-4 overflow-hidden rounded-[9px] border border-relgov-border bg-relgov-surface">
          {pautas.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-relgov-muted">
              A lixeira está vazia.
            </p>
          )}
          {pautas.map((pauta) => {
            const restantes = pauta.excluidoEm ? diasRestantes(pauta.excluidoEm) : 0;
            return (
              <div
                key={pauta.$id}
                className="flex flex-wrap items-center justify-between gap-3 border-b border-relgov-divider-2 px-4 py-3.5 last:border-b-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-[13.5px] font-semibold text-relgov-navy">
                    {pauta.titulo}
                  </p>
                  <p className="text-[11.5px] text-relgov-muted">
                    Excluída em {pauta.excluidoEm ? formatDateBR(pauta.excluidoEm) : "—"} ·{" "}
                    {restantes === 0
                      ? "será apagada definitivamente em breve"
                      : `${restantes} dia(s) até a exclusão definitiva`}
                  </p>
                </div>
                <div className="flex gap-2">
                  <RestaurarButton pautaId={pauta.$id} />
                  <ExcluirAgoraButton pautaId={pauta.$id} titulo={pauta.titulo} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
