// Modelo de dados da proposta — estrutura focada em CONVERSÃO.
// Lógica: Diagnóstico → Convicção → Solução → Decisão.

export interface Solution {
  name: string;
  problemSolved: string; // o problema que resolve
  howItWorks: string; // como funciona
  expectedBenefit: string; // benefício esperado
  deliverables: string[]; // entregáveis
}

export interface Tier {
  name: string;
  price: string;
  priceSuffix: string;
  billing: "recorrente" | "pontual";
  description: string;
  features: string[];
  featured?: boolean;
}

// Investimento agrupado por solução (cada solução tem seus planos).
export interface InvestmentGroup {
  solution: string;
  plans: Tier[];
}

export interface Pillar {
  title: string;
  description: string;
}

export interface Step {
  title: string;
  description: string;
}

export type ProposalTheme = "dark" | "light";

export interface ProposalData {
  // ---- Marca / identidade ----
  companyName: string;
  companyInitial: string;
  logo?: string; // logo da empresa (data URL base64) — puxada de "Sua Empresa"
  proposalNumber: string;
  showProposalNumber: boolean;
  theme: ProposalTheme; // tema do documento (escuro/claro)
  accent: string;

  // ---- 1. Capa ----
  clientName: string;
  clientLegalName: string;
  dateLabel: string;
  validUntilLabel: string;
  coverEyebrow: string; // rótulo pequeno acima do título da capa
  coverHeadline: string; // 1ª parte do título da capa (antes do nome)
  headlineLead: string;

  // ---- 2. O que entendemos (diagnóstico) ----
  understandingHeading: string;
  currentSituation: string;
  mainBottleneck: string;
  opportunity: string;
  objective: string;

  // ---- 3. O custo de continuar igual (urgência) ----
  costQuestion: string;
  costOperational: string;
  costFinancial: string;
  costStrategic: string;

  // ---- Visibilidade de blocos (olho) ----
  showUnderstanding: boolean;
  showCost: boolean;
  showStrategy: boolean;
  showSolutions: boolean;
  showInvestment: boolean;
  showConsultantRec: boolean;
  showNextSteps: boolean;

  // ---- 4. Estratégia recomendada (convicção) ----
  strategyHeading: string;
  strategyIntro: string;
  pillars: Pillar[];

  // ---- 5. Soluções recomendadas (execução; vêm do catálogo) ----
  solutionsHeading: string;
  solutionsNote: string;
  solutions: Solution[];

  // ---- 6. Investimento ----
  investHeading: string;
  investmentGroups: InvestmentGroup[]; // planos por solução
  recommendationReason: string; // justificativa do plano recomendado

  // ---- 7. Recomendação do consultor (decisão) ----
  consultantRecHeading: string;
  consultantRecText: string;
  consultantRecReasons: string[];

  // ---- 8. Próximos passos ----
  nextStepsHeading: string;
  steps: Step[];
  ctaLabel: string;

  // ---- Consultor (rodapé) ----
  consultantTerm?: string; // termo do papel (Consultor/Especialista/...) — de "Sua Empresa"
  responsible: string;
  phone: string;
  email: string;
}
