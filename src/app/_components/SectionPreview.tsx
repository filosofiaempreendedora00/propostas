"use client";

import { useEffect, useState } from "react";
import {
  renderBlockPreviewHTML,
  type PreviewBlock,
} from "@/lib/proposal/render";
import type { ProposalData } from "@/lib/proposal/types";

type PreviewTheme = "dark" | "light";

/**
 * Preview ao vivo de UMA seção da proposta. Reutilizado no Templates e em
 * "Sua Empresa" (soluções / planos). Recebe o bloco e um payload parcial já
 * memoizado pelo pai — só re-renderiza (debounced) quando o payload/tema muda.
 * Traz um switcher de fundo claro/escuro só pra visualização (não altera os dados).
 */
export default function SectionPreview({
  block,
  payload,
  title = "Preview da seção",
  subtitle,
  empty = "Abra um item para ver o preview da seção.",
}: {
  block: PreviewBlock;
  payload: Partial<ProposalData> | null;
  title?: string;
  subtitle?: string;
  empty?: string;
}) {
  const [html, setHtml] = useState("");
  const [theme, setTheme] = useState<PreviewTheme>("dark");

  useEffect(() => {
    if (!payload) {
      setHtml("");
      return;
    }
    const id = setTimeout(
      () => setHtml(renderBlockPreviewHTML(block, { ...payload, theme })),
      250,
    );
    return () => clearTimeout(id);
  }, [block, payload, theme]);

  return (
    <section className="flex min-h-0 flex-col">
      <div className="flex shrink-0 items-center gap-3 border-b border-line px-5 py-3">
        <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-accent/15 text-[10px] text-accent">
          ◉
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-ink">{title}</div>
          {subtitle && (
            <div className="truncate text-[11px] text-ink-mute">{subtitle}</div>
          )}
        </div>
        <ThemeToggle theme={theme} onChange={setTheme} />
      </div>
      <div className="flex min-h-0 flex-1 justify-center overflow-hidden bg-bg">
        {payload && html ? (
          <iframe
            title={title}
            srcDoc={html}
            style={{ maxWidth: 860 }}
            className="h-full w-full border-0"
          />
        ) : (
          <div className="grid place-items-center p-8 text-center text-sm text-ink-mute">
            {empty}
          </div>
        )}
      </div>
    </section>
  );
}

function ThemeToggle({
  theme,
  onChange,
}: {
  theme: PreviewTheme;
  onChange: (t: PreviewTheme) => void;
}) {
  const opts: { key: PreviewTheme; label: string; title: string }[] = [
    { key: "dark", label: "🌙", title: "Fundo escuro" },
    { key: "light", label: "☀️", title: "Fundo claro" },
  ];
  return (
    <div className="inline-flex shrink-0 rounded-lg border border-line p-0.5 text-xs">
      {opts.map((o) => (
        <button
          key={o.key}
          type="button"
          title={o.title}
          aria-label={o.title}
          onClick={() => onChange(o.key)}
          className={`rounded-md px-2 py-1 leading-none transition ${
            theme === o.key
              ? "bg-accent/15 text-accent"
              : "text-ink-mute hover:text-ink-soft"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
