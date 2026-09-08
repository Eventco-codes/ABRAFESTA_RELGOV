"use client";

import { PrimaryButton, SecondaryButton } from "./buttons";

export function SelecaoExportarToolbar({
  total,
  totalParaExportar = total,
  selecionados,
  onBaixarXlsx,
}: {
  total: number;
  /** Universo exportado quando nada está selecionado — em listas paginadas, o total filtrado, não só a página atual. */
  totalParaExportar?: number;
  selecionados: number;
  onBaixarXlsx: () => void;
}) {
  if (total === 0) return null;

  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2 print:hidden">
      <p className="text-[12.5px] text-relgov-muted">
        {selecionados > 0
          ? `${selecionados} de ${total} selecionado(s)`
          : `Nenhum selecionado — exportando todos os ${totalParaExportar} listados`}
      </p>
      <div className="flex gap-2">
        <SecondaryButton type="button" onClick={onBaixarXlsx}>
          ⬇ Baixar XLSX
        </SecondaryButton>
        <PrimaryButton type="button" onClick={() => window.print()}>
          ⬇ Baixar PDF
        </PrimaryButton>
      </div>
    </div>
  );
}
