"use client";

import { PrimaryButton } from "@/components/relgov/buttons";

export function PrintButton() {
  return <PrimaryButton onClick={() => window.print()}>Baixar PDF</PrimaryButton>;
}
