"use client";

import { useEffect, useState } from "react";
import {
  renderBlockPreviewHTML,
  type PreviewBlock,
} from "@/lib/proposal/render";
import type { ProposalData } from "@/lib/proposal/types";

/**
 * Preview ao vivo de UMA seção da proposta. Reutilizado no Templates e em
 * "Sua Empresa" (soluções / planos). Recebe o bloco e um payload parcial já
 * memoizado pelo pai — só re-renderiza (debounced) quando o payload muda.
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

  useEffect(() => {
    if (!payload) {
      setHtml("");
      return;
    }
    const id = setTimeout(
      () => setHtml(renderBlockPreviewHTML(block, payload)),
      250,
    );
    return () => clearTimeout(id);
  }, [block, payload]);

  return (
    <section className="flex min-h-0 flex-col">
      <div className="flex shrink-0 items-center gap-2 border-b border-line px-5 py-3">
        <span className="grid h-5 w-5 place-items-center rounded-full bg-accent/15 text-[10px] text-accent">
          ◉
        </span>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-ink">{title}</div>
          {subtitle && (
            <div className="truncate text-[11px] text-ink-mute">{subtitle}</div>
          )}
        </div>
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
