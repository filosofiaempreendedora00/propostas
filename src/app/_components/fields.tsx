"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";

// Componentes de formulário compartilhados entre os ambientes.

export function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.12em] text-ink-mute">
      {children}
    </span>
  );
}

export function TextInput({
  value,
  onChange,
  placeholder,
  highlight = false,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  highlight?: boolean;
}) {
  return (
    <input
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full rounded-lg border bg-field px-3 py-2 text-sm text-field-ink outline-none transition placeholder:text-field-mute focus:border-accent focus:ring-2 focus:ring-accent/30 ${
        highlight
          ? "border-accent ring-2 ring-accent/40"
          : "border-field-line"
      }`}
    />
  );
}

export function TextArea({
  value,
  onChange,
  rows = 3,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  // Cresce com o conteúdo — nada de texto cortado nem caixinha apertada.
  const autosize = (el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };
  useEffect(() => autosize(ref.current), [value]);
  return (
    <textarea
      ref={ref}
      value={value}
      rows={rows}
      placeholder={placeholder}
      onChange={(e) => {
        onChange(e.target.value);
        autosize(e.target);
      }}
      className="w-full resize-none overflow-hidden rounded-lg border border-field-line bg-field px-3.5 py-2.5 text-sm leading-relaxed text-field-ink outline-none transition placeholder:text-field-mute focus:border-accent focus:ring-2 focus:ring-accent/30"
    />
  );
}

/** Editor de lista "um item por linha". */
export function LineList({
  value,
  onChange,
  rows = 3,
  placeholder,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <TextArea
      value={value.join("\n")}
      onChange={(raw) => onChange(raw.split("\n").map((s) => s).filter((s) => s.trim() !== ""))}
      rows={rows}
      placeholder={placeholder}
    />
  );
}

/**
 * Editor de lista item-a-item (mais amigável que o "um por linha").
 * Cada item é uma linha com bullet e botão de remover; Enter cria a próxima,
 * Backspace numa linha vazia remove. Substitui o textarea cru.
 */
export function ItemList({
  value,
  onChange,
  placeholder,
  addLabel = "+ adicionar",
}: {
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  addLabel?: string;
}) {
  const inputs = useRef<(HTMLTextAreaElement | null)[]>([]);
  const focusAt = useRef<number | null>(null);

  // Cada item cresce com o texto (quebra linha) — nada de item cortado.
  const autosize = (el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };

  // Depois de adicionar/remover, devolve o foco pra linha certa.
  useEffect(() => {
    if (focusAt.current == null) return;
    const el = inputs.current[focusAt.current];
    if (el) {
      el.focus();
      const end = el.value.length;
      el.setSelectionRange(end, end);
    }
    focusAt.current = null;
  });

  const setAt = (i: number, text: string) =>
    onChange(value.map((v, j) => (j === i ? text : v)));

  const addAfter = (i: number) => {
    const next = [...value];
    next.splice(i + 1, 0, "");
    onChange(next);
    focusAt.current = i + 1;
  };

  const removeAt = (i: number) => {
    onChange(value.filter((_, j) => j !== i));
    focusAt.current = Math.max(0, i - 1);
  };

  return (
    <div className="space-y-1.5">
      {value.map((item, i) => (
        <div key={i} className="group flex items-center gap-1.5">
          <Image
            src="/kronos-ponteiro-areia.png"
            alt=""
            aria-hidden
            width={36}
            height={36}
            unoptimized
            className="-mx-1 h-9 w-9 shrink-0 rotate-90 select-none"
          />
          <textarea
            ref={(el) => {
              inputs.current[i] = el;
              autosize(el);
            }}
            value={item}
            rows={1}
            placeholder={placeholder}
            onChange={(e) => {
              setAt(i, e.target.value);
              autosize(e.target);
            }}
            onKeyDown={(e) => {
              // Enter cria o próximo item (Shift+Enter quebra linha no mesmo).
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                addAfter(i);
              } else if (e.key === "Backspace" && item === "") {
                e.preventDefault();
                removeAt(i);
              }
            }}
            className="flex-1 resize-none overflow-hidden rounded-lg border border-field-line bg-field px-3 py-2 text-sm leading-relaxed text-field-ink outline-none transition placeholder:text-field-mute focus:border-accent focus:ring-2 focus:ring-accent/30"
          />
          <button
            type="button"
            onClick={() => removeAt(i)}
            aria-label="Remover item"
            className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-ink-mute opacity-0 transition hover:bg-panel hover:text-red-400 focus:opacity-100 group-hover:opacity-100"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => addAfter(value.length - 1)}
        className="mt-1.5 flex items-center gap-1.5 rounded-lg border border-dashed border-accent/45 bg-accent/[0.07] px-3.5 py-2 text-sm font-semibold text-accent transition hover:border-accent hover:bg-accent/15"
      >
        {addLabel}
      </button>
    </div>
  );
}

// Cor da chamada por bloco — apenas DUAS cores da paleta Kronos, intercaladas
// bloco a bloco (limpo, sem "espalhar"). Ambos hexes existem no globals.css.
const BLOCK_COLORS = [
  "#a89070", // Areia média (--color-accent)
  "#cdb99a", // Areia clara (--color-ink-soft)
];

export function SectionTitle({
  n,
  right,
  children,
  onJump,
  open,
  onToggle,
}: {
  n?: number;
  right?: React.ReactNode;
  children: React.ReactNode;
  /** Se passado, o título vira um botão que leva o preview até esta seção. */
  onJump?: () => void;
  /** Accordion: quando onToggle é passado, o título expande/recolhe a seção
   * (chevron indica o estado). Tem precedência sobre onJump. */
  open?: boolean;
  onToggle?: () => void;
}) {
  const color =
    n != null ? BLOCK_COLORS[(n - 1) % BLOCK_COLORS.length] : "var(--color-accent)";
  const collapsible = !!onToggle;

  const inner = (
    <>
      {n != null && (
        <span
          className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-xs font-bold"
          style={{ backgroundColor: color, color: "#150c06" }}
        >
          {n}
        </span>
      )}
      <span className="flex min-w-0 flex-col gap-0.5 leading-none">
        {n != null && (
          <span
            className="text-[9px] font-bold uppercase tracking-[0.22em]"
            style={{ color }}
          >
            Bloco {n}
          </span>
        )}
        <span className="flex items-center gap-1.5 text-[14.5px] font-semibold tracking-tight text-ink">
          {children}
          {!collapsible && onJump && (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
              className="h-3.5 w-3.5 shrink-0 opacity-0 transition group-hover:opacity-100"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
            </svg>
          )}
        </span>
      </span>
    </>
  );

  return (
    <div
      className="mb-4 mt-9 flex items-center justify-between gap-2 border-b-2 pb-2.5 first:mt-0"
      style={{
        borderColor: `color-mix(in srgb, ${color} 45%, transparent)`,
      }}
    >
      {collapsible ? (
        <button
          type="button"
          onClick={onToggle}
          title={open ? "Recolher" : "Expandir"}
          className="group flex min-w-0 flex-1 items-center gap-2.5 text-left transition hover:opacity-80"
        >
          {inner}
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
            className={`ml-auto h-4 w-4 shrink-0 text-ink-mute transition-transform ${open ? "rotate-180" : ""}`}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      ) : onJump ? (
        <button
          type="button"
          onClick={onJump}
          title="Ver esta seção no preview"
          className="group flex min-w-0 items-center gap-2.5 text-left transition hover:opacity-80"
        >
          {inner}
        </button>
      ) : (
        <h2 className="flex min-w-0 items-center gap-2.5">{inner}</h2>
      )}
      {right}
    </div>
  );
}

export function MiniBtn({
  children,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md border px-2.5 py-1 text-xs font-medium transition ${
        danger
          ? "border-line text-ink-mute hover:border-red-500/50 hover:text-red-400"
          : "border-line text-ink-soft hover:border-accent/60 hover:text-accent"
      }`}
    >
      {children}
    </button>
  );
}
