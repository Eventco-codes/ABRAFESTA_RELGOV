"use client";

import { useTransition } from "react";

export function ToggleSwitch({
  checked,
  onToggle,
}: {
  checked: boolean;
  onToggle: (value: boolean) => Promise<void>;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={pending}
      onClick={() => startTransition(() => onToggle(!checked))}
      className={`relative h-5 w-9 rounded-full p-0.5 transition-colors disabled:opacity-60 ${
        checked ? "bg-relgov-success" : "bg-relgov-border-control"
      }`}
    >
      <span
        className={`block h-4 w-4 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </button>
  );
}
