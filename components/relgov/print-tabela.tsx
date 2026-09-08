export function PrintTabela({
  titulo,
  colunas,
  linhas,
}: {
  titulo: string;
  colunas: string[];
  linhas: (string | number)[][];
}) {
  return (
    <div className="hidden print:block">
      <h1 className="mb-4 font-display text-[20px] font-semibold text-relgov-navy">{titulo}</h1>
      <table className="w-full border-collapse text-[11px]">
        <thead>
          <tr>
            {colunas.map((c) => (
              <th key={c} className="border border-relgov-border px-2 py-1 text-left">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhas.map((linha, i) => (
            <tr key={i}>
              {linha.map((v, j) => (
                <td key={j} className="border border-relgov-border px-2 py-1">
                  {v}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
