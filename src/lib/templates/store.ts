"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { BlockTemplate, BlockKey } from "./types";
import { blankTemplate } from "./seed";
import { listTemplates, upsertTemplate, deleteTemplate } from "./actions";

// Reexport pra manter a API pública.
export { pickDefault, blankTemplate } from "./seed";

const DEBOUNCE_MS = 600;

export function useTemplates() {
  const [items, setItems] = useState<BlockTemplate[]>([]);
  const [ready, setReady] = useState(false);
  const itemsRef = useRef<BlockTemplate[]>([]);
  itemsRef.current = items;
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    let alive = true;
    listTemplates()
      .then((rows) => alive && (setItems(rows), setReady(true)))
      .catch(() => alive && setReady(true));
    const t = timers.current;
    return () => {
      alive = false;
      for (const id of t.values()) clearTimeout(id);
    };
  }, []);

  const scheduleFlush = useCallback((id: string) => {
    const m = timers.current;
    const prev = m.get(id);
    if (prev) clearTimeout(prev);
    m.set(
      id,
      setTimeout(() => {
        m.delete(id);
        const idx = itemsRef.current.findIndex((t) => t.id === id);
        if (idx !== -1) void upsertTemplate(itemsRef.current[idx], idx);
      }, DEBOUNCE_MS),
    );
  }, []);

  const add = useCallback((block: BlockKey): string => {
    const t = blankTemplate(block, "Nova variação");
    const order = itemsRef.current.length;
    setItems((prev) => [...prev, t]);
    void upsertTemplate(t, order);
    return t.id;
  }, []);

  const update = useCallback(
    (id: string, patch: Partial<BlockTemplate>) => {
      setItems((prev) =>
        prev.map((t) => (t.id === id ? { ...t, ...patch } : t)),
      );
      scheduleFlush(id);
    },
    [scheduleFlush],
  );

  const remove = useCallback((id: string) => {
    const t = timers.current.get(id);
    if (t) {
      clearTimeout(t);
      timers.current.delete(id);
    }
    setItems((prev) => prev.filter((x) => x.id !== id));
    void deleteTemplate(id);
  }, []);

  return { items, ready, add, update, remove };
}
