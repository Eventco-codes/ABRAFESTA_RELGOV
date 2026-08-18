import type { ReactNode } from "react";

export function PageHeader({
  title,
  subtitle,
  actions,
  tabs,
}: {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  tabs?: ReactNode;
}) {
  return (
    <header className="border-b border-relgov-border bg-relgov-surface px-7 pt-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-semibold text-relgov-navy">{title}</h1>
          {subtitle && (
            <p className="mt-[3px] text-[12.5px] text-relgov-muted">{subtitle}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2.5">{actions}</div>}
      </div>
      {tabs && <div className="mt-4 flex gap-6">{tabs}</div>}
    </header>
  );
}
