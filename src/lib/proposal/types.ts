// Modelo de dados da proposta. Fonte única de verdade — alimenta o preview e o export.

export interface Pain {
  title: string;
  description: string;
}

export interface Solution {
  title: string;
  description: string;
  features: string[];
}

export interface Tier {
  name: string;
  price: string; // ex: "R$ 4.997"
  priceSuffix: string; // ex: "/mês"
  description: string;
  features: string[];
  featured?: boolean;
}

export interface ProposalData {
  // Identidade
  companyName: string;
  companyInitial: string;
  proposalNumber: string;
  accent: string; // cor de acento (futuro: cor do cliente)

  // Cliente
  clientName: string; // nome em destaque na capa
  clientLegalName: string; // razão social (meta/rodapé)

  // Datas (já formatadas para exibição)
  dateLabel: string; // ex: "30 de maio de 2026"
  validUntilLabel: string; // ex: "29 de junho de 2026"

  // Capa
  headlineLead: string;

  // O Desafio
  challengeHeading: string;
  challengeStatement: string; // suporta **negrito**
  pains: Pain[];

  // Soluções
  solutionsHeading: string;
  solutionsNote: string;
  solutions: Solution[];

  // Investimento
  investHeading: string;
  tiers: Tier[];

  // Fechamento
  closingHeading: string;
  closingLead: string;
  ctaLabel: string;
  responsible: string;
  phone: string;
  email: string;
}
