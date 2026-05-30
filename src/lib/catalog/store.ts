"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  CatalogSolution,
  CatalogPlan,
  CatalogConsultant,
} from "./types";

const KEY = "propostas.catalog.v1";
const PLANS_KEY = "propostas.plans.v1";
const CONSULTANTS_KEY = "propostas.consultants.v1";

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

// ===================== PLANOS =====================

function loadPlans(): CatalogPlan[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(PLANS_KEY);
    return raw ? (JSON.parse(raw) as CatalogPlan[]) : [];
  } catch {
    return [];
  }
}

function savePlans(items: CatalogPlan[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PLANS_KEY, JSON.stringify(items));
  } catch {
    /* ignora */
  }
}

export function blankPlan(): CatalogPlan {
  return {
    id: uid(),
    name: "Novo plano",
    price: "R$ 0",
    priceSuffix: "/mês",
    description: "",
    featured: false,
    solutionIds: [],
    extraFeatures: [],
  };
}

const SEED_PLANS: CatalogPlan[] = [
  {
    id: "plan-1",
    name: "Starter",
    price: "R$ 2.997",
    priceSuffix: "/mês",
    description: "Ideal para começar com o essencial.",
    featured: false,
    solutionIds: ["seed-1"],
    extraFeatures: ["Suporte por e-mail", "Relatório mensal"],
  },
  {
    id: "plan-2",
    name: "Scale",
    price: "R$ 4.997",
    priceSuffix: "/mês",
    description: "O equilíbrio entre escopo e resultado.",
    featured: true,
    solutionIds: ["seed-1", "seed-2"],
    extraFeatures: ["Suporte prioritário", "Reunião quinzenal"],
  },
  {
    id: "plan-3",
    name: "Enterprise",
    price: "R$ 7.497",
    priceSuffix: "/mês",
    description: "Operação completa, sob medida.",
    featured: false,
    solutionIds: ["seed-1", "seed-2"],
    extraFeatures: ["Gerente dedicado", "SLA personalizado"],
  },
];

export function usePlans() {
  const [items, setItems] = useState<CatalogPlan[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let initial = loadPlans();
    if (initial.length === 0) {
      initial = SEED_PLANS;
      savePlans(initial);
    }
    setItems(initial);
    setReady(true);
  }, []);

  const add = useCallback((): string => {
    const p = blankPlan();
    setItems((prev) => {
      const next = [...prev, p];
      savePlans(next);
      return next;
    });
    return p.id;
  }, []);

  const update = useCallback((id: string, patch: Partial<CatalogPlan>) => {
    setItems((prev) => {
      const next = prev.map((p) => (p.id === id ? { ...p, ...patch } : p));
      savePlans(next);
      return next;
    });
  }, []);

  const remove = useCallback((id: string) => {
    setItems((prev) => {
      const next = prev.filter((p) => p.id !== id);
      savePlans(next);
      return next;
    });
  }, []);

  return { items, ready, add, update, remove };
}

// ===================== CONSULTORES =====================

function loadConsultants(): CatalogConsultant[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CONSULTANTS_KEY);
    return raw ? (JSON.parse(raw) as CatalogConsultant[]) : [];
  } catch {
    return [];
  }
}

function saveConsultants(items: CatalogConsultant[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CONSULTANTS_KEY, JSON.stringify(items));
  } catch {
    /* ignora */
  }
}

export function blankConsultant(): CatalogConsultant {
  return { id: uid(), name: "Novo consultor", email: "", phone: "" };
}

const SEED_CONSULTANTS: CatalogConsultant[] = [
  {
    id: "cons-1",
    name: "Nome do Consultor",
    email: "consultor@suaempresa.com",
    phone: "(00) 00000-0000",
  },
];

export function useConsultants() {
  const [items, setItems] = useState<CatalogConsultant[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let initial = loadConsultants();
    if (initial.length === 0) {
      initial = SEED_CONSULTANTS;
      saveConsultants(initial);
    }
    setItems(initial);
    setReady(true);
  }, []);

  const add = useCallback((): string => {
    const c = blankConsultant();
    setItems((prev) => {
      const next = [...prev, c];
      saveConsultants(next);
      return next;
    });
    return c.id;
  }, []);

  const update = useCallback(
    (id: string, patch: Partial<CatalogConsultant>) => {
      setItems((prev) => {
        const next = prev.map((c) => (c.id === id ? { ...c, ...patch } : c));
        saveConsultants(next);
        return next;
      });
    },
    [],
  );

  const remove = useCallback((id: string) => {
    setItems((prev) => {
      const next = prev.filter((c) => c.id !== id);
      saveConsultants(next);
      return next;
    });
  }, []);

  return { items, ready, add, update, remove };
}
