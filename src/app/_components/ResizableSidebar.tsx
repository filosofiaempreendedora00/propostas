"use client";

import { Children, useEffect, useRef, useState } from "react";

// Lista lateral (ESQUERDA) com largura arrastável — espelha o ResizableSplit do
// preview, só que controla o painel da esquerda. 1º filho = lista; 2º = conteúdo
// (ocupa o resto). Largura persistida em localStorage por storageKey.
export default function ResizableSidebar({
  storageKey,
  defaultWidth = 260,
  min = 200,
  max = 440,
  minContent = 480,
  className = "",
  children,
}: {
  storageKey: string;
  defaultWidth?: number;
  min?: number;
  max?: number;
  minContent?: number;
  className?: string;
  children: React.ReactNode;
}) {
  const kids = Children.toArray(children);
  const sidebar = kids[0] ?? null;
  const content = kids[1] ?? null;

  const ref = useRef<HTMLDivElement>(null);
  const wRef = useRef(defaultWidth); // largura EXIBIDA (clampada)
  const intendedRef = useRef(defaultWidth); // largura DESEJADA
  const [w, setW] = useState(defaultWidth);
  const [drag, setDrag] = useState(false);

  const applyClamp = () => {
    const el = ref.current;
    const roomCap = el ? el.clientWidth - minContent : max;
    const cap = Math.min(max, roomCap > min ? roomCap : min);
    const nw = Math.max(min, Math.min(intendedRef.current, cap));
    wRef.current = nw;
    setW(nw);
  };

  // Largura salva + CLAMP ao espaço disponível (montagem + resize) — sem isso,
  // em janelas menores a lista come o espaço do conteúdo (mesmo bug do preview).
  useEffect(() => {
    try {
      const v = Number(localStorage.getItem(storageKey));
      if (v && v > 0) intendedRef.current = v;
    } catch {
      /* ignora */
    }
    applyClamp();
    const onResize = () => applyClamp();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey, min, max, minContent]);

  const startDrag = (e: React.PointerEvent) => {
    e.preventDefault();
    setDrag(true);
    const onMove = (ev: PointerEvent) => {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      let nw = ev.clientX - r.left;
      nw = Math.max(min, Math.min(max, nw));
      nw = Math.min(nw, r.width - minContent); // garante espaço mínimo ao conteúdo
      wRef.current = nw;
      intendedRef.current = nw;
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
    intendedRef.current = defaultWidth;
    applyClamp();
    try {
      localStorage.setItem(storageKey, String(defaultWidth));
    } catch {
      /* ignora */
    }
  };

  return (
    <div
      ref={ref}
      className={`flex h-full min-h-0 min-w-0 overflow-hidden ${className}`}
    >
      <div style={{ width: w }} className="min-h-0 shrink-0 overflow-hidden">
        {sidebar}
      </div>

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

      <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">{content}</div>

      {/* Overlay durante o arraste: mantém o ponteiro mesmo sobre o iframe */}
      {drag && (
        <div className="fixed inset-0 z-50 cursor-col-resize select-none" />
      )}
    </div>
  );
}
