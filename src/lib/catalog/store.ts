"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  CatalogSolution,
  SolutionPlan,
  CatalogConsultant,
} from "./types";

const KEY = "propostas.catalog.v1";
const CONSULTANTS_KEY = "propostas.consultants.v1";

function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return "id-" + Math.abs(Date.now()).toString(36);
}

// ----- planos (dentro da solução) -----
export function blankSolutionPlan(name: string): SolutionPlan {
  return {
    id: uid(),
    name,
    billing: "recorrente",
    price: "R$ 0",
    description: "",
    features: ["Item incluso"],
    featured: false,
  };
}

function defaultPlans(): SolutionPlan[] {
  return [
    {
      id: uid(),
      name: "Plano 1",
      billing: "recorrente",
      price: "R$ 2.997",
      description: "Essencial para começar.",
      features: ["Entrega principal", "Suporte por e-mail"],
      featured: false,
    },
    {
      id: uid(),
      name: "Plano 2",
      billing: "recorrente",
      price: "R$ 4.997",
      description: "O equilíbrio entre escopo e resultado.",
      features: ["Tudo do Plano 1", "Suporte prioritário", "Reunião quinzenal"],
      featured: true,
    },
    {
      id: uid(),
      name: "Plano 3",
      billing: "pontual",
      price: "R$ 14.997",
      description: "Projeto completo, pagamento único.",
      features: ["Escopo fechado", "Entrega completa"],
      featured: false,
    },
  ];
}

// ----- persistência -----
// Normaliza dados antigos (ex.: soluções salvas antes de 'plans' existir).
function normalizeSolution(s: Partial<CatalogSolution>): CatalogSolution {
  return {
    id: s.id ?? uid(),
    icon: s.icon ?? "✦",
    name: s.name ?? "Solução",
    tagline: s.tagline ?? "",
    problemSolved: s.problemSolved ?? "",
    howItWorks: s.howItWorks ?? "",
    expectedBenefit: s.expectedBenefit ?? "",
    deliverables: s.deliverables ?? [],
    plans: s.plans && s.plans.length > 0 ? s.plans : defaultPlans(),
    scope: s.scope ?? [],
    timeline: s.timeline ?? "",
    highlights: s.highlights ?? [],
    requirements: s.requirements ?? [],
    notes: s.notes ?? "",
  };
}

function load(): CatalogSolution[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as Partial<CatalogSolution>[];
    return arr.map(normalizeSolution);
  } catch {
    return [];
  }
}

function save(items: CatalogSolution[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    /* ignora */
  }
}

export function blankSolution(index: number): CatalogSolution {
  return {
    id: uid(),
    icon: "✦",
    name: `Solução ${index}`,
    tagline: "",
    problemSolved: "",
    howItWorks: "",
    expectedBenefit: "",
    deliverables: [],
    plans: defaultPlans(),
    scope: [],
    timeline: "",
    highlights: [],
    requirements: [],
    notes: "",
  };
}

const SEED: CatalogSolution[] = [
  {
    id: "seed-1",
    icon: "📈",
    name: "Solução 1",
    tagline: "Resumo de uma linha do que esta solução entrega.",
    problemSolved:
      "Descreva qual dor concreta do cliente esta solução elimina.",
    howItWorks: "Explique em poucas linhas como a solução funciona na prática.",
    expectedBenefit:
      "Descreva o resultado esperado — de preferência tangível e mensurável.",
    deliverables: [
      "Entregável principal",
      "Segundo entregável relevante",
      "Terceiro ponto de valor",
    ],
    plans: defaultPlans(),
    scope: ["Item de escopo 1", "Item de escopo 2"],
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
    problemSolved: "Qual problema esta segunda solução resolve.",
    howItWorks: "Como ela funciona, em linguagem simples.",
    expectedBenefit: "O ganho que o cliente passa a ter.",
    deliverables: ["Entregável principal", "Segundo entregável relevante"],
    plans: defaultPlans(),
    scope: ["Item de escopo 1", "Item de escopo 2"],
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
    const s = blankSolution(1);
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
