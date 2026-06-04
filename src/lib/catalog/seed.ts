// Dados/seed e construtores "blank" do catálogo.
// Módulo PURO (sem "use client"/"use server") — importável no client e no server.

import type {
  CatalogSolution,
  SolutionPlan,
  CatalogConsultant,
} from "./types";

export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return "id-" + Math.abs(Date.now()).toString(36) + Math.random().toString(36).slice(2, 8);
}

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

export function defaultPlans(): SolutionPlan[] {
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

export function blankConsultant(): CatalogConsultant {
  return { id: uid(), name: "Novo consultor", role: "Consultor", email: "", phone: "" };
}

export const SEED_SOLUTIONS: CatalogSolution[] = [
  {
    id: "seed-1",
    icon: "📈",
    name: "Solução 1",
    tagline: "Resumo de uma linha do que esta solução entrega.",
    problemSolved: "Descreva qual dor concreta do cliente esta solução elimina.",
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

export const SEED_CONSULTANTS: CatalogConsultant[] = [
  {
    id: "cons-1",
    name: "Nome do Consultor",
    role: "Consultor",
    email: "consultor@suaempresa.com",
    phone: "(00) 00000-0000",
  },
];
