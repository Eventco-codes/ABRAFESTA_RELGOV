import Link from "next/link";
import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

export function PrimaryButton({ className = "", ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={`rounded-[7px] bg-relgov-gold px-4 py-2.5 text-[13px] font-semibold text-relgov-navy transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    />
  );
}

export function SecondaryButton({ className = "", ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={`rounded-[7px] border border-relgov-border-control bg-relgov-surface px-3.5 py-2.5 text-[13px] font-medium text-relgov-navy transition-colors hover:bg-relgov-surface-subtle disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    />
  );
}

export function SecondaryLinkButton({
  href,
  className = "",
  children,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`rounded-[7px] border border-relgov-border-control bg-relgov-surface px-3.5 py-2.5 text-[13px] font-medium text-relgov-navy transition-colors hover:bg-relgov-surface-subtle ${className}`}
    >
      {children}
    </Link>
  );
}

export function PrimaryLinkButton({
  href,
  className = "",
  children,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`rounded-[7px] bg-relgov-gold px-4 py-2.5 text-[13px] font-semibold text-relgov-navy transition-opacity hover:opacity-90 ${className}`}
    >
      {children}
    </Link>
  );
}
