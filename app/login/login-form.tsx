"use client";

import { useActionState } from "react";

import { loginWithPassword, type LoginState } from "./actions";

const initialState: LoginState = {};

export function LoginForm({ oauthError }: { oauthError?: string }) {
  const [state, formAction, pending] = useActionState(loginWithPassword, initialState);

  const errorMessage =
    state.error ??
    (oauthError === "sem-convite"
      ? "Este e-mail ainda não tem acesso ao RelGov. Peça um convite ao administrador."
      : oauthError === "oauth"
        ? "Não foi possível entrar com o Google. Tente novamente."
        : undefined);

  return (
    <div className="w-full max-w-sm">
      <h1 className="font-display text-2xl font-semibold text-relgov-navy">
        Entrar no painel
      </h1>
      <p className="mt-1 text-sm text-relgov-muted">
        Acesso restrito à equipe RelGov e à diretoria.
      </p>

      {errorMessage && (
        <p className="mt-4 rounded-md border border-relgov-danger-border bg-relgov-danger-bg px-3 py-2 text-sm text-relgov-danger">
          {errorMessage}
        </p>
      )}

      <form action={formAction} className="mt-6 flex flex-col gap-4">
        <div>
          <label htmlFor="email" className="relgov-label block">
            E-mail
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="relgov@abrafesta.com.br"
            className="mt-1.5 w-full rounded-[7px] border border-relgov-border-control bg-relgov-surface px-3.5 py-2.5 text-[13.5px] text-relgov-body outline-none focus:border-relgov-navy"
          />
        </div>
        <div>
          <label htmlFor="password" className="relgov-label block">
            Senha
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="mt-1.5 w-full rounded-[7px] border border-relgov-border-control bg-relgov-surface px-3.5 py-2.5 text-[13.5px] text-relgov-body outline-none focus:border-relgov-navy"
          />
        </div>

        <button
          type="submit"
          disabled={pending}
          className="mt-2 rounded-[7px] bg-relgov-gold px-4 py-3 text-sm font-semibold text-relgov-navy transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {pending ? "Entrando…" : "Entrar"}
        </button>
      </form>

      <div className="my-5 flex items-center gap-3">
        <span className="h-px flex-1 bg-relgov-border" />
        <span className="text-xs text-relgov-muted">ou</span>
        <span className="h-px flex-1 bg-relgov-border" />
      </div>

      <a
        href="/api/auth/google"
        className="flex w-full items-center justify-center rounded-[7px] border border-relgov-border-control bg-relgov-surface px-4 py-3 text-sm font-medium text-relgov-body transition-colors hover:bg-relgov-surface-subtle"
      >
        Continuar com Google
      </a>

      <p className="mt-5 text-center text-[11.5px] text-relgov-muted">
        Novo por aqui? O acesso é criado por convite do administrador.
      </p>
    </div>
  );
}
