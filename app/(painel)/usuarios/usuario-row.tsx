"use client";

import type { RelgovRole } from "@/lib/appwrite/constants";
import { alternarReceberAlertas, alternarStatusUsuario } from "./actions";
import { RoleSelect } from "./role-select";
import { ToggleSwitch } from "./toggle-switch";

export function UsuarioRow({
  userId,
  role,
  receberAlertas,
  ativo,
  isSelf,
}: {
  userId: string;
  role: RelgovRole;
  receberAlertas: boolean;
  ativo: boolean;
  isSelf: boolean;
}) {
  return (
    <>
      <RoleSelect userId={userId} role={role} />
      <ToggleSwitch checked={receberAlertas} onToggle={(v) => alternarReceberAlertas(userId, v)} />
      {isSelf ? (
        <span className="text-[11.5px] text-relgov-muted">você</span>
      ) : (
        <button
          type="button"
          onClick={() => alternarStatusUsuario(userId, !ativo)}
          className={`text-[11.5px] font-medium ${ativo ? "text-relgov-success" : "text-relgov-muted"}`}
        >
          {ativo ? "Ativo" : "Desativado"}
        </button>
      )}
    </>
  );
}
