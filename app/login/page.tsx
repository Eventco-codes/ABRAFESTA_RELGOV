import Image from "next/image";

import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;

  return (
    <div className="flex min-h-screen w-full">
      <aside className="hidden w-[380px] shrink-0 flex-col bg-relgov-navy p-11 sm:flex">
        <div>
          <Image
            src="/abrafesta-logo.png"
            alt="ABRAFESTA"
            width={190}
            height={59}
            priority
            className="h-auto w-[190px]"
          />
          <p className="relgov-label mt-1.5 text-[10px] text-white/50">
            Relações Governamentais
          </p>
        </div>
        <div className="mt-auto">
          <h2 className="font-display text-[26px] font-semibold leading-tight text-white">
            Monitoramento legislativo do setor de eventos
          </h2>
          <p className="mt-3 text-[13px] leading-relaxed text-white/65">
            22 pautas acompanhadas, cobranças com prazo e resumo semanal por
            e-mail.
          </p>
        </div>
      </aside>

      <main className="flex flex-1 items-center justify-center bg-relgov-bg p-11">
        <LoginForm oauthError={erro} />
      </main>
    </div>
  );
}
