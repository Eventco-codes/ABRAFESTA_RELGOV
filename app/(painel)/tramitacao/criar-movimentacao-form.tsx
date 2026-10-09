"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { PrimaryButton, SecondaryButton } from "@/components/relgov/buttons";
import {
  criarPautaRapida,
  registrarMovimentacaoComPauta,
  type MovimentacaoFormState,
} from "../pautas/actions";

interface PautaOpcao {
  id: string;
  titulo: string;
}

const inputClass =
  "rounded-[7px] border border-relgov-border-control bg-relgov-surface px-3 py-2 text-[12.5px] outline-none focus:border-relgov-navy";

const PANEL_WIDTH = 360;
const MARGIN = 16;

interface Posicao {
  top: number;
  left: number;
  maxHeight: number;
}

export function CriarMovimentacaoForm({ pautas }: { pautas: PautaOpcao[] }) {
  const [open, setOpen] = useState(false);
  const [modo, setModo] = useState<"existente" | "nova">("existente");
  const [pos, setPos] = useState<Posicao | null>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);

  function calcularPosicao() {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const left = Math.min(Math.max(rect.left, MARGIN), window.innerWidth - PANEL_WIDTH - MARGIN);
    const top = rect.bottom + 8;
    const maxHeight = Math.max(window.innerHeight - top - MARGIN, 200);
    setPos({ top, left, maxHeight });
  }

  function toggle() {
    if (open) {
      setOpen(false);
      return;
    }
    calcularPosicao();
    setOpen(true);
  }

  // Mantém a janela alinhada ao botão se a viewport mudar de tamanho enquanto está aberta —
  // sem isso, uma janela mais alta que o espaço restante ficava cortada (position: absolute
  // é recortado pelo container com scroll do painel; position: fixed + portal resolve isso).
  useEffect(() => {
    if (!open) return;
    window.addEventListener("resize", calcularPosicao);
    return () => window.removeEventListener("resize", calcularPosicao);
  }, [open]);

  return (
    <>
      <span ref={triggerRef} className="inline-block">
        <PrimaryButton onClick={toggle}>+ Criar</PrimaryButton>
      </span>
      {open &&
        pos &&
        createPortal(
          <>
            <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
            <div
              style={{ top: pos.top, left: pos.left, width: PANEL_WIDTH, maxHeight: pos.maxHeight }}
              className="fixed z-40 flex flex-col rounded-[9px] border border-relgov-border bg-relgov-surface shadow-lg"
            >
              <div className="flex shrink-0 border-b border-relgov-divider px-2 pt-2">
                <TabButton active={modo === "existente"} onClick={() => setModo("existente")}>
                  Pauta existente
                </TabButton>
                <TabButton active={modo === "nova"} onClick={() => setModo("nova")}>
                  Nova pauta
                </TabButton>
              </div>
              <div className="overflow-y-auto p-4">
                {modo === "existente" ? (
                  <PautaExistenteForm pautas={pautas} onClose={() => setOpen(false)} />
                ) : (
                  <NovaPautaForm onClose={() => setOpen(false)} />
                )}
              </div>
            </div>
          </>,
          document.body
        )}
    </>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`border-b-2 px-3 pb-2 text-[12px] font-medium ${
        active
          ? "border-relgov-gold text-relgov-navy"
          : "border-transparent text-relgov-muted hover:text-relgov-body"
      }`}
    >
      {children}
    </button>
  );
}

function ArquivoField() {
  return (
    <div>
      <label className="relgov-label block text-[9.5px]">Anexar documento (opcional)</label>
      <input
        type="file"
        name="arquivo"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png"
        className="mt-1 w-full rounded-[7px] border border-relgov-border-control bg-relgov-surface px-3 py-2 text-[12px] outline-none file:mr-2 file:rounded-[5px] file:border-0 file:bg-relgov-surface-subtle file:px-2 file:py-1 file:text-[11.5px]"
      />
    </div>
  );
}

function PautaExistenteForm({
  pautas,
  onClose,
}: {
  pautas: PautaOpcao[];
  onClose: () => void;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState<MovimentacaoFormState, FormData>(
    async (prev, formData) => {
      const result = await registrarMovimentacaoComPauta(prev, formData);
      if (!result.error) {
        formRef.current?.reset();
        onClose();
        router.refresh();
      }
      return result;
    },
    {}
  );

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-2.5">
      {state.error && (
        <p className="rounded-md border border-relgov-danger-border bg-relgov-danger-bg px-2.5 py-1.5 text-[12px] text-relgov-danger">
          {state.error}
        </p>
      )}
      <select name="pautaId" required defaultValue="" className={inputClass}>
        <option value="" disabled>
          Selecione a pauta…
        </option>
        {pautas.map((p) => (
          <option key={p.id} value={p.id}>
            {p.titulo}
          </option>
        ))}
      </select>
      <input name="titulo" placeholder="Título da movimentação" required className={inputClass} />
      <textarea name="descricao" placeholder="Descrição" required rows={3} className={inputClass} />
      <ArquivoField />
      <div className="flex gap-2">
        <PrimaryButton type="submit" disabled={pending} className="flex-1">
          {pending ? "Salvando…" : "Salvar"}
        </PrimaryButton>
        <SecondaryButton type="button" onClick={onClose}>
          Cancelar
        </SecondaryButton>
      </div>
    </form>
  );
}

function NovaPautaForm({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState<MovimentacaoFormState, FormData>(
    async (prev, formData) => {
      const result = await criarPautaRapida(prev, formData);
      if (!result.error) {
        formRef.current?.reset();
        onClose();
        router.refresh();
      }
      return result;
    },
    {}
  );

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-2.5">
      {state.error && (
        <p className="rounded-md border border-relgov-danger-border bg-relgov-danger-bg px-2.5 py-1.5 text-[12px] text-relgov-danger">
          {state.error}
        </p>
      )}
      <input name="pautaTitulo" placeholder="Título da pauta (ex.: PL 1234/2026 — …)" required className={inputClass} />
      <input name="pautaEixo" placeholder="Eixo (ex.: Trabalhista / jornada de trabalho)" required className={inputClass} />
      <input
        name="pautaLinkOficial"
        type="url"
        placeholder="Link oficial monitorado (opcional)"
        className={inputClass}
      />
      <input name="movTitulo" placeholder="Título da movimentação inicial (opcional)" className={inputClass} />
      <textarea
        name="movDescricao"
        placeholder="Descrição da movimentação inicial (opcional)"
        rows={2}
        className={inputClass}
      />
      <ArquivoField />
      <div className="flex gap-2">
        <PrimaryButton type="submit" disabled={pending} className="flex-1">
          {pending ? "Criando…" : "Criar pauta"}
        </PrimaryButton>
        <SecondaryButton type="button" onClick={onClose}>
          Cancelar
        </SecondaryButton>
      </div>
      <p className="text-[10.5px] text-relgov-muted">
        Os demais campos (atuação, contexto, interlocutores…) ficam com um valor
        provisório — complete depois em &quot;Editar pauta&quot;.
      </p>
    </form>
  );
}
