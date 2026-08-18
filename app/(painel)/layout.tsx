import { requireSession } from "@/lib/auth";
import { listPautas, listPendencias } from "@/lib/relgov/data";
import { pautasAtivas, pendenciasVencidas } from "@/lib/relgov/derived";
import { Sidebar } from "@/components/relgov/sidebar";
import type { RelgovRole } from "@/lib/appwrite/constants";

export default async function PainelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, tablesDB } = await requireSession();
  const [pautas, pendencias] = await Promise.all([
    listPautas(tablesDB),
    listPendencias(tablesDB),
  ]);

  return (
    <div className="flex min-h-screen w-full bg-relgov-bg">
      <Sidebar
        userName={user.name || user.email}
        role={user.role as RelgovRole}
        pautasAtivasCount={pautasAtivas(pautas).length}
        pendenciasVencidasCount={pendenciasVencidas(pendencias).length}
      />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
