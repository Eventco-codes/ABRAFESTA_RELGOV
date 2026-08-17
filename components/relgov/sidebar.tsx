"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { logout } from "@/app/login/actions";
import type { RelgovRole } from "@/lib/appwrite/constants";

interface NavItem {
  href: string;
  label: string;
  count?: number;
  badge?: number;
  adminOnly?: boolean;
}

interface SidebarProps {
  userName: string;
  role: RelgovRole;
  pautasAtivasCount: number;
  pendenciasVencidasCount: number;
}

const ROLE_LABEL: Record<RelgovRole, string> = {
  administrador: "Administrador",
  coordenador_relgov: "Coordenador RelGov",
  leitor: "Leitor",
};

export function Sidebar({
  userName,
  role,
  pautasAtivasCount,
  pendenciasVencidasCount,
}: SidebarProps) {
  const pathname = usePathname();

  const items: NavItem[] = [
    { href: "/painel", label: "Painel" },
    { href: "/pautas", label: "Pautas", count: pautasAtivasCount },
    { href: "/pendencias", label: "Pendências", badge: pendenciasVencidasCount },
    { href: "/tramitacao", label: "Tramitação" },
    { href: "/relatorios", label: "Relatórios" },
    { href: "/usuarios", label: "Usuários", adminOnly: true },
  ];

  return (
    <aside className="flex h-screen w-[236px] shrink-0 flex-col bg-relgov-navy text-white print:hidden">
      <div className="border-b border-white/10 px-5 pb-[18px] pt-[22px]">
        <Image
          src="/abrafesta-logo.png"
          alt="ABRAFESTA"
          width={176}
          height={54}
          className="h-auto w-[176px]"
        />
        <p className="relgov-label mt-[7px] text-[10px] text-white/50">
          Relações Governamentais
        </p>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2.5 py-3.5">
        {items
          .filter((item) => !item.adminOnly || role === "administrador")
          .map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 rounded-[7px] px-3 py-2.5 text-[13.5px] transition-colors ${
                  active
                    ? "bg-relgov-gold font-semibold text-relgov-navy"
                    : "font-normal text-white/78 hover:bg-white/[.08]"
                }`}
              >
                <span
                  className={`h-[5px] w-[5px] shrink-0 rounded-full ${
                    active ? "bg-relgov-navy" : "bg-white/35"
                  }`}
                />
                <span className="flex-1">{item.label}</span>
                {typeof item.count === "number" && (
                  <span className="font-mono text-[11px] text-white/45">
                    {item.count}
                  </span>
                )}
                {typeof item.badge === "number" && item.badge > 0 && (
                  <span className="rounded-[9px] bg-[#b3382c] px-1.5 py-0.5 font-mono text-[10px] font-semibold text-white">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
      </nav>

      <div className="mt-auto border-t border-white/10 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-relgov-navy-light text-xs font-semibold text-relgov-gold">
            {userName.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12.5px] font-medium text-white">{userName}</p>
            <p className="truncate text-[11px] text-white/50">{ROLE_LABEL[role]}</p>
          </div>
        </div>
        <form action={logout} className="mt-3">
          <button
            type="submit"
            className="w-full text-left text-[11.5px] text-white/50 hover:text-white/80"
          >
            Sair
          </button>
        </form>
      </div>
    </aside>
  );
}
