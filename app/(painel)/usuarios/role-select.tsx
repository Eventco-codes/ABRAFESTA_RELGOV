"use client";

import { useTransition } from "react";

import { LABELS, type RelgovRole } from "@/lib/appwrite/constants";
import { atualizarPapelUsuario } from "./actions";

const ROLE_LABEL: Record<RelgovRole, string> = {
  [LABELS.administrador]: "Administrador",
  [LABELS.coordenadorRelgov]: "Coordenador RelGov",
  [LABELS.leitor]: "Leitor",
};

export function RoleSelect({ userId, role }: { userId: string; role: RelgovRole }) {
  const [pending, startTransition] = useTransition();

  return (
    <select
      defaultValue={role}
      disabled={pending}
      onChange={(e) =>
        startTransition(() => atualizarPapelUsuario(userId, e.target.value as RelgovRole))
      }
      className={`rounded-[5px] border-none px-2 py-1 text-[12px] font-medium ${
        role === LABELS.administrador
          ? "bg-relgov-navy text-white"
          : "bg-relgov-tag-blue-bg text-relgov-tag-blue-text"
      }`}
    >
      {Object.values(LABELS).map((value) => (
        <option key={value} value={value}>
          {ROLE_LABEL[value]}
        </option>
      ))}
    </select>
  );
}
