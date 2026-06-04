// Catálogo da empresa (ambiente "Sua Empresa").

export type Billing = "recorrente" | "pontual";

// Plano DENTRO de uma solução. Pode ser recorrente (mensal) ou pontual (projeto único).
export interface SolutionPlan {
  id: string;
  name: string; // ex: "Plano 1"
  billing: Billing;
  price: string; // ex: "R$ 4.997"
  description: string;
  features: string[];
  featured: boolean; // destaque "Recomendado"
}

export interface CatalogSolution {
  id: string;
  icon: string; // emoji
  name: string;
  tagline: string; // resumo de uma linha
  problemSolved: string; // o problema que resolve
  howItWorks: string; // como funciona
  expectedBenefit: string; // benefício esperado
  deliverables: string[]; // entregáveis concretos
  plans: SolutionPlan[]; // planos desta solução (recorrente/pontual)
  scope: string[]; // uso interno
  timeline: string; // prazo de execução
  highlights: string[]; // diferenciais
  requirements: string[]; // o que precisamos do cliente
  notes: string; // observações internas
}

// Consultores / responsáveis comerciais.
export interface CatalogConsultant {
  id: string;
  name: string;
  role: string; // cargo/papel (Consultor, Especialista, Diretor comercial, ...)
  email: string;
  phone: string;
}
