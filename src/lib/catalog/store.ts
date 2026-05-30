"use client";

import { useCallback, useEffect, useState } from "react";
import type { CatalogSolution } from "./types";

const KEY = "propostas.catalog.v1";

// Camada de persistência isolada — hoje localStorage, amanhã trocamos por API/Postgres
// mexendo só aqui.
function load(): CatalogSolution[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as CatalogSolution[]) : [];
  } catch {
    return [];
  }
}

function save(items: CatalogSolution[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    /* quota / privado — ignora */
  }
}

function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return "sol-" + Math.abs(Date.now()).toString(36);
}

export function blankSolution(index: number): CatalogSolution {
  return {
    id: uid(),
    icon: "✦",
    name: `Solução ${index}`,
    tagline: "",
    description: "",
    scope: [],
    deliverables: [],
    timeline: "",
    highlights: [],
    requirements: [],
    notes: "",
  };
}

// Soluções de exemplo no primeiro acesso (UX: o usuário já vê o fluxo funcionando).
const SEED: CatalogSolution[] = [
  {
    id: "seed-1",
    icon: "📈",
    name: "Solução 1",
    tagline: "Resumo de uma linha do que esta solução entrega.",
    description:
      "Descreva aqui a solução: o que é, como funciona e qual problema do cliente ela resolve. Este texto entra na proposta.",
    scope: ["Item de escopo 1", "Item de escopo 2", "Item de escopo 3"],
    deliverables: [
      "Entregável ou benefício principal",
      "Segundo entregável relevante",
      "Terceiro ponto de valor",
    ],
    timeline: "30 dias úteis",
    highlights: ["Diferencial que vale destacar"],
    requirements: ["Acesso/material que precisamos do cliente"],
    notes: "",
  },
  {
    id: "seed-2",
    icon: "🎯",
    name: "Solução 2",
    tagline: "Outra frente de trabalho, totalmente preenchível.",
    description:
      "Cada solução é cadastrada uma vez aqui e reaproveitada nas propostas dos seus clientes.",
    scope: ["Item de escopo 1", "Item de escopo 2"],
    deliverables: [
      "Entregável ou benefício principal",
      "Segundo entregável relevante",
    ],
    timeline: "45 dias úteis",
    highlights: [],
    requirements: [],
    notes: "",
  },
];

export function useCatalog() {
  const [items, setItems] = useState<CatalogSolution[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let initial = load();
    if (initial.length === 0) {
      initial = SEED;
      save(initial);
    }
    setItems(initial);
    setReady(true);
  }, []);

  const add = useCallback((): string => {
    const s = blankSolution(1); // id já gerado aqui; nome ajustado no updater
    setItems((prev) => {
      const next = [...prev, { ...s, name: `Solução ${prev.length + 1}` }];
      save(next);
      return next;
    });
    return s.id;
  }, []);

  const update = useCallback((id: string, patch: Partial<CatalogSolution>) => {
    setItems((prev) => {
      const next = prev.map((s) => (s.id === id ? { ...s, ...patch } : s));
      save(next);
      return next;
    });
  }, []);

  const remove = useCallback((id: string) => {
    setItems((prev) => {
      const next = prev.filter((s) => s.id !== id);
      save(next);
      return next;
    });
  }, []);

  return { items, ready, add, update, remove };
}
