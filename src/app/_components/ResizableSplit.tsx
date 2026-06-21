"use client";

import { Children, useEffect, useRef, useState } from "react";

// Dois painéis lado a lado com uma alça vertical arrastável entre eles.
// O painel da DIREITA tem largura controlada (px); o da esquerda ocupa o resto.
// Detalhe crítico: durante o arraste, um overlay fixo captura o ponteiro —
// sem ele, passar o cursor sobre o <iframe> do preview "solta" o arraste.
export default function ResizableSplit({
  storageKey,
  defaultRight = 440,
  minLeft = 320,
  minRight = 280,
  children,
}: {
  storageKey: string;
  defaultRight?: number;
  minLeft?: number;
  minRight?: number;
  children: React.ReactNode;
}) {
  const kids = Children.toArray(children);
  const left = kids[0] ?? null;
  const right = kids[1] ?? null;

  const ref = useRef<HTMLDivElement>(null);
  const wRef = useRef(defaultRight);
  const [w, setW] = useState(defaultRight);
  const [drag, setDrag] = useState(false);

  // largura salva (após montar, evita mismatch de hidratação)
  useEffect(() => {
    try {
      const v = Number(localStorage.getItem(storageKey));
      if (v && v > 0) {
        wRef.current = v;
        setW(v);
      }
    } catch {
      /* ignora */
    }
  }, [storageKey]);

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
    wRef.current = defaultRight;
    setW(defaultRight);
    try {
      localStorage.setItem(storageKey, String(defaultRight));
    } catch {
      /* ignora */
    }
  };

  return (
    <div ref={ref} className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
      <div className="min-h-0 min-w-0 flex-1 overflow-hidden">{left}</div>

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

      <div
        style={{ width: w }}
        className="min-h-0 shrink-0 overflow-hidden"
      >
        {right}
      </div>

      {/* Overlay durante o arraste: mantém o ponteiro mesmo sobre o iframe */}
      {drag && <div className="fixed inset-0 z-50 cursor-col-resize select-none" />}
    </div>
  );
}
