"use client";

import { Children, useEffect, useRef, useState } from "react";

// Dois painéis lado a lado com uma alça vertical arrastável entre eles.
// O painel da DIREITA tem largura controlada (px); o da esquerda ocupa o resto.
// O da direita (preview) pode ser RECOLHIDO — aí o da esquerda ocupa tudo e uma
// aba fina traz o preview de volta. Evita a sensação de "tudo espremido".
// Detalhe crítico: durante o arraste, um overlay fixo captura o ponteiro —
// sem ele, passar o cursor sobre o <iframe> do preview "solta" o arraste.
export default function ResizableSplit({
  storageKey,
  defaultRight = 440,
  minLeft = 320,
  minRight = 280,
  rightLabel = "Preview",
  children,
}: {
  storageKey: string;
  defaultRight?: number;
  minLeft?: number;
  minRight?: number;
  rightLabel?: string;
  children: React.ReactNode;
}) {
  const kids = Children.toArray(children);
  const left = kids[0] ?? null;
  const right = kids[1] ?? null;

  const ref = useRef<HTMLDivElement>(null);
  const wRef = useRef(defaultRight); // largura EXIBIDA (já clampada)
  const intendedRef = useRef(defaultRight); // largura DESEJADA (salva/arrastada)
  const [w, setW] = useState(defaultRight);
  const [drag, setDrag] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const collapsedKey = `${storageKey}.collapsed`;

  const clampTo = (val: number) => {
    const el = ref.current;
    const max = el ? el.clientWidth - minLeft : val;
    return Math.max(minRight, Math.min(val, max > minRight ? max : minRight));
  };
  const applyClamp = () => {
    const nw = clampTo(intendedRef.current);
    wRef.current = nw;
    setW(nw);
  };

  // Largura salva + CLAMP ao espaço disponível (na montagem e em cada resize).
  // Sem o clamp, uma largura salva numa janela maior estoura o container e,
  // como o painel é shrink-0, o preview é cortado (bug no Mac / telas menores).
  // Guardamos a largura DESEJADA (intendedRef) e só clampamos a EXIBIDA, então
  // ao voltar a janela pro tamanho grande a largura original é restaurada.
  useEffect(() => {
    try {
      const v = Number(localStorage.getItem(storageKey));
      if (v && v > 0) intendedRef.current = v;
      setCollapsed(localStorage.getItem(collapsedKey) === "1");
    } catch {
      /* ignora */
    }
    applyClamp();
    const onResize = () => applyClamp();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey, minLeft, minRight]);

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem(collapsedKey, next ? "1" : "0");
      } catch {
        /* ignora */
      }
      return next;
    });
  };

  // Anexa os listeners SINCRONAMENTE no pointerdown (sem esperar re-render),
  // pra não perder nenhum movimento — inclusive os primeiros do arraste.
  const startDrag = (e: React.PointerEvent) => {
    e.preventDefault();
    setDrag(true);
    const onMove = (ev: PointerEvent) => {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      let nw = r.right - ev.clientX;
      const maxRight = r.width - minLeft;
      nw = Math.max(minRight, Math.min(maxRight, nw));
      wRef.current = nw;
      intendedRef.current = nw; // arraste explícito = nova intenção
      setW(nw);
    };
    const onUp = () => {
      setDrag(false);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      try {
        localStorage.setItem(storageKey, String(Math.round(wRef.current)));
      } catch {
        /* ignora */
      }
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const reset = () => {
    intendedRef.current = defaultRight;
    applyClamp();
    try {
      localStorage.setItem(storageKey, String(defaultRight));
    } catch {
      /* ignora */
    }
  };

  return (
    <div ref={ref} className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
      <div className="min-h-0 min-w-0 flex-1 overflow-hidden">{left}</div>

      {collapsed ? (
        // Aba fina que devolve o preview.
        <button
          type="button"
          onClick={toggleCollapsed}
          title={`Mostrar ${rightLabel.toLowerCase()}`}
          className="kronos-btn-glow group relative z-10 flex w-9 shrink-0 cursor-pointer flex-col items-center justify-center gap-2.5 border-l border-accent bg-accent text-bg transition hover:opacity-90"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
            className="h-4 w-4"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
          <span className="text-[11px] font-bold uppercase tracking-wider [writing-mode:vertical-rl] rotate-180">
            {rightLabel}
          </span>
        </button>
      ) : (
        <>
          {/* Alça */}
          <div
            role="separator"
            aria-orientation="vertical"
            title="Arraste para redimensionar · duplo-clique para resetar"
            onPointerDown={startDrag}
            onDoubleClick={reset}
            className={`group relative z-20 flex w-1.5 shrink-0 cursor-col-resize items-center justify-center transition-colors ${
              drag ? "bg-accent" : "bg-line hover:bg-accent/60"
            }`}
          >
            {/* Botão de recolher — fica na borda direita do formulário (área de
                padding, não encosta no conteúdo). */}
            <button
              type="button"
              onClick={toggleCollapsed}
              onPointerDown={(e) => e.stopPropagation()}
              onDoubleClick={(e) => e.stopPropagation()}
              title={`Ocultar ${rightLabel.toLowerCase()}`}
              className="absolute right-full top-3 z-30 mr-1 grid h-6 w-6 cursor-pointer place-items-center rounded-full border border-line bg-panel text-ink-mute shadow-sm transition hover:border-accent hover:text-accent"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
                className="h-3.5 w-3.5"
              >
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
            {/* área de clique mais larga (invisível) */}
            <span className="absolute inset-y-0 -left-2 -right-2" />
            {/* pega central (aparece no hover/arraste) */}
            <span
              className={`pointer-events-none absolute flex flex-col items-center gap-[3px] ${
                drag ? "" : "opacity-0 transition-opacity group-hover:opacity-100"
              }`}
            >
              <span className="h-1 w-1 rounded-full bg-ink-soft" />
              <span className="h-1 w-1 rounded-full bg-ink-soft" />
              <span className="h-1 w-1 rounded-full bg-ink-soft" />
            </span>
          </div>

          <div style={{ width: w }} className="min-h-0 shrink-0 overflow-hidden">
            {right}
          </div>

          {/* Overlay durante o arraste: mantém o ponteiro mesmo sobre o iframe */}
          {drag && (
            <div className="fixed inset-0 z-50 cursor-col-resize select-none" />
          )}
        </>
      )}
    </div>
  );
}
