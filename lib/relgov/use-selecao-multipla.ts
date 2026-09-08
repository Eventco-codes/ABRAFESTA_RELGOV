"use client";

import { useState } from "react";

/**
 * Seleção múltipla (checkboxes) para listas com exportação — Deputados/Senadores.
 * `itensParaExportar` (default = `itensVisiveis`) é o universo exportado quando
 * nada está selecionado; em listas paginadas ele deve ser a lista completa
 * filtrada (não só a página atual), para "exportar tudo" cobrir o filtro
 * inteiro em vez de só o que está na tela.
 */
export function useSelecaoMultipla<T extends { $id: string }>(
  itensVisiveis: T[],
  itensParaExportar: T[] = itensVisiveis
) {
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  // A lista visível muda a cada paginação/filtro/ordenação (nova navegação
  // server-driven) — zera a seleção para não exportar itens de uma página
  // anterior que não têm mais relação com o que está na tela. Ajuste de
  // estado durante a renderização (não em useEffect) é o padrão recomendado
  // pelo React para "resetar estado quando uma prop muda", sem re-render em
  // cascata: https://react.dev/learn/you-might-not-need-an-effect
  const [itensAnteriores, setItensAnteriores] = useState(itensVisiveis);
  if (itensAnteriores !== itensVisiveis) {
    setItensAnteriores(itensVisiveis);
    setSelecionados(new Set());
  }

  function alternar(id: string) {
    setSelecionados((prev) => {
      const proximo = new Set(prev);
      if (proximo.has(id)) proximo.delete(id);
      else proximo.add(id);
      return proximo;
    });
  }

  function alternarTodos() {
    setSelecionados((prev) =>
      prev.size === itensVisiveis.length ? new Set() : new Set(itensVisiveis.map((i) => i.$id))
    );
  }

  const paraExportar =
    selecionados.size > 0
      ? itensParaExportar.filter((i) => selecionados.has(i.$id))
      : itensParaExportar;

  return { selecionados, alternar, alternarTodos, paraExportar };
}
