"use client";

import { useEffect, useRef, useState } from "react";
import {
  renderBlockPreviewHTML,
  type PreviewBlock,
} from "@/lib/proposal/render";
import type { ProposalData } from "@/lib/proposal/types";
import type { EditMsg } from "@/lib/proposal/edit";

type PreviewTheme = "dark" | "light";

/**
 * Preview ao vivo de UMA seção da proposta. Reutilizado no Templates e em
 * "Sua Empresa" (soluções / planos). Recebe o bloco e um payload parcial já
 * memoizado pelo pai — só re-renderiza (debounced) quando o payload/tema muda.
 *
 * Edição inline: com `editable`, clicar num texto do preview o torna editável
 * (contenteditable). Ao confirmar (blur/Enter), o preview manda a edição pro pai
 * via `onEdit`, que reflete nos campos do meio da tela. `editableCatalog` liga
 * também a edição dos cards de solução/plano (Sua Empresa).
 */
export default function SectionPreview({
  block,
  payload,
  title = "Preview da seção",
  subtitle,
  empty = "Abra um item para ver o preview da seção.",
  editable = false,
  editableCatalog = false,
  onEdit,
}: {
  block: PreviewBlock;
  payload: Partial<ProposalData> | null;
  title?: string;
  subtitle?: string;
  empty?: string;
  editable?: boolean;
  editableCatalog?: boolean;
  onEdit?: (m: EditMsg) => void;
}) {
  const [html, setHtml] = useState("");
  const [theme, setTheme] = useState<PreviewTheme>("dark");
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!payload) {
      setHtml("");
      return;
    }
    const id = setTimeout(
      () =>
        setHtml(
          renderBlockPreviewHTML(block, { ...payload, theme }, {
            editable,
            editableCatalog,
          }),
        ),
      250,
    );
    return () => clearTimeout(id);
  }, [block, payload, theme, editable, editableCatalog]);

  // Recebe as edições inline vindas do iframe deste preview e repassa ao pai.
  useEffect(() => {
    if (!editable || !onEdit) return;
    function onMsg(e: MessageEvent) {
      const m = e.data as EditMsg;
      if (!m || m.source !== "proposal-edit") return;
      // Só aceita do iframe deste componente (evita conversa cruzada).
      if (iframeRef.current && e.source !== iframeRef.current.contentWindow)
        return;
      onEdit?.(m);
    }
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [editable, onEdit]);

  return (
    <section className="theme-onyx flex h-full w-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center gap-3 border-b border-line px-5 py-3">
        <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-accent/15 text-[10px] text-accent">
          ◉
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-ink">{title}</div>
          {editable ? (
            <div className="truncate text-[11px] text-accent">
              ✎ Clique num texto do preview para editar aqui
            </div>
          ) : (
            subtitle && (
              <div className="truncate text-[11px] text-ink-mute">
                {subtitle}
              </div>
            )
          )}
        </div>
        <ThemeToggle theme={theme} onChange={setTheme} />
      </div>
      <div className="flex min-h-0 flex-1 justify-center overflow-hidden bg-bg">
        {payload && html ? (
          <iframe
            ref={iframeRef}
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
