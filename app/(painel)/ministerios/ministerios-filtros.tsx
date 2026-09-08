"use client";

import { useRouter } from "next/navigation";
import { useRef } from "react";

const selectClass =
  "rounded-[7px] border border-relgov-border-control bg-relgov-surface px-3 py-2.5 text-[13px] text-relgov-body outline-none";

export function MinisteriosFiltros({ defaults }: { defaults: { busca?: string } }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  function submit() {
    if (!formRef.current) return;
    const formData = new FormData(formRef.current);
    const params = new URLSearchParams();
    for (const [key, value] of formData.entries()) {
      if (typeof value === "string" && value) params.set(key, value);
    }
    router.push(`/ministerios?${params.toString()}`);
  }

  return (
    <form
      ref={formRef}
      className="my-4 flex flex-wrap gap-2.5"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <input
        type="search"
        name="busca"
        defaultValue={defaults.busca}
        placeholder="Buscar por nome ou sigla…"
        className={`min-w-[260px] flex-1 ${selectClass}`}
        onChange={submit}
      />
    </form>
  );
}
