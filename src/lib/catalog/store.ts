"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  CatalogSolution,
  CatalogConsultant,
} from "./types";
import { blankSolution, blankConsultant } from "./seed";
import {
  listSolutions,
  upsertSolution,
  deleteSolution,
  listConsultants,
  upsertConsultant,
  deleteConsultant,
} from "./actions";

// Reexport pra manter a API pública usada nos componentes.
export { blankSolutionPlan, blankSolution, blankConsultant } from "./seed";

const DEBOUNCE_MS = 600;

// ===================== SOLUÇÕES =====================

export function useCatalog() {
  const [items, setItems] = useState<CatalogSolution[]>([]);
  const [ready, setReady] = useState(false);
  const itemsRef = useRef<CatalogSolution[]>([]);
  itemsRef.current = items;
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    let alive = true;
    listSolutions()
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
        const idx = itemsRef.current.findIndex((s) => s.id === id);
        if (idx !== -1) void upsertSolution(itemsRef.current[idx], idx);
      }, DEBOUNCE_MS),
    );
  }, []);

  const add = useCallback((): string => {
    const s = blankSolution(itemsRef.current.length + 1);
    const order = itemsRef.current.length;
    setItems((prev) => [...prev, s]);
    void upsertSolution(s, order);
    return s.id;
  }, []);

  const update = useCallback(
    (id: string, patch: Partial<CatalogSolution>) => {
      setItems((prev) =>
        prev.map((s) => (s.id === id ? { ...s, ...patch } : s)),
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
    setItems((prev) => prev.filter((s) => s.id !== id));
    void deleteSolution(id);
  }, []);

  return { items, ready, add, update, remove };
}

// ===================== CONSULTORES =====================

export function useConsultants() {
  const [items, setItems] = useState<CatalogConsultant[]>([]);
  const [ready, setReady] = useState(false);
  const itemsRef = useRef<CatalogConsultant[]>([]);
  itemsRef.current = items;
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    let alive = true;
    listConsultants()
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
        const idx = itemsRef.current.findIndex((c) => c.id === id);
        if (idx !== -1) void upsertConsultant(itemsRef.current[idx], idx);
      }, DEBOUNCE_MS),
    );
  }, []);

  const add = useCallback((): string => {
    const c = blankConsultant();
    const order = itemsRef.current.length;
    setItems((prev) => [...prev, c]);
    void upsertConsultant(c, order);
    return c.id;
  }, []);

  const update = useCallback(
    (id: string, patch: Partial<CatalogConsultant>) => {
      setItems((prev) =>
        prev.map((c) => (c.id === id ? { ...c, ...patch } : c)),
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
    setItems((prev) => prev.filter((c) => c.id !== id));
    void deleteConsultant(id);
  }, []);

  return { items, ready, add, update, remove };
}
