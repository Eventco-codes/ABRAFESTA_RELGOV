import { PageHeader } from "@/components/relgov/page-header";
import { createAdminClient } from "@/lib/appwrite/server";
import { ALL_ROLE_LABELS, LABELS, hasRelgovAccess, type RelgovRole } from "@/lib/appwrite/constants";
import { requireRole } from "@/lib/auth";
import { Query } from "node-appwrite";
import { ConviteForm } from "./convite-form";
import { UsuarioRow } from "./usuario-row";

function pickRole(labels: string[]): RelgovRole {
  return ALL_ROLE_LABELS.find((label) => labels.includes(label)) ?? LABELS.leitor;
}

export default async function UsuariosPage() {
  const { user: usuarioAtual } = await requireRole("administrador");
  const { users } = createAdminClient();
  const { users: todos } = await users.list({ queries: [Query.limit(200)] });

  const relgovUsers = todos
    .filter((u) => hasRelgovAccess(u.labels))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div>
      <PageHeader title="Usuários" subtitle={`${relgovUsers.length} contas com acesso ao RelGov`} />

      <div className="flex flex-col gap-6 px-7 py-6">
        <ConviteForm />

        <div className="overflow-x-auto rounded-[9px] border border-relgov-border bg-relgov-surface">
          <div className="grid min-w-[720px] grid-cols-[1fr_1.2fr_1fr_130px_100px] gap-3 border-b-2 border-relgov-border px-4 py-3">
            {["Nome", "E-mail", "Papel", "Recebe alertas", "Situação"].map((h) => (
              <span key={h} className="relgov-label text-[10px] text-relgov-label">
                {h}
              </span>
            ))}
          </div>
          {relgovUsers.map((u) => {
            const prefs = u.prefs as Record<string, unknown>;
            return (
              <div
                key={u.$id}
                className="grid min-w-[720px] grid-cols-[1fr_1.2fr_1fr_130px_100px] items-center gap-3 border-b border-relgov-divider-2 px-4 py-3 last:border-b-0"
              >
                <div className="flex items-center gap-2.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-relgov-navy-light text-[11px] font-semibold text-relgov-gold">
                    {u.name.charAt(0).toUpperCase() || "?"}
                  </span>
                  <span className="truncate text-[13px] font-semibold text-relgov-body">
                    {u.name}
                  </span>
                </div>
                <span className="truncate text-[12.5px] text-relgov-secondary">{u.email}</span>
                <UsuarioRow
                  userId={u.$id}
                  role={pickRole(u.labels)}
                  receberAlertas={prefs?.receberAlertas !== false}
                  ativo={u.status}
                  isSelf={u.$id === usuarioAtual.$id}
                />
              </div>
            );
          })}
        </div>

        <div className="rounded-[9px] border border-relgov-border bg-relgov-surface p-4">
          <p className="relgov-label text-[10px]">Papéis de acesso</p>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <PapelCard
              titulo="Administrador"
              descricao="Cria, edita e desativa pautas; gerencia usuários."
            />
            <PapelCard
              titulo="Coordenador RelGov"
              descricao="Registra movimentações e cuida das pendências."
            />
            <PapelCard titulo="Leitor" descricao="Consulta pautas e recebe relatórios." />
          </div>
        </div>
      </div>
    </div>
  );
}

function PapelCard({ titulo, descricao }: { titulo: string; descricao: string }) {
  return (
    <div>
      <p className="text-[12.5px] font-semibold text-relgov-navy">{titulo}</p>
      <p className="mt-1 text-[12px] leading-relaxed text-relgov-muted">{descricao}</p>
    </div>
  );
}
