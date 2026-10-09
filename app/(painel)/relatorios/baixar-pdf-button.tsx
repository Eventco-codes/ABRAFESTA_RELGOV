export function BaixarPdfButton({ apenasAlta }: { apenasAlta: boolean }) {
  return (
    // Download direto do PDF gerado no servidor (Content-Disposition: attachment) — não usa o diálogo de impressão.
    <a
      href={`/api/relatorios/pdf${apenasAlta ? "?apenasAlta=1" : ""}`}
      download
      className="rounded-[7px] bg-relgov-gold px-4 py-2.5 text-[13px] font-semibold text-relgov-navy transition-opacity hover:opacity-90"
    >
      Baixar PDF
    </a>
  );
}
