import type { ProposalData } from "./types";

// Conteúdo "coringa" padrão — qualquer empresa preenche por cima.
export const DEFAULT_PROPOSAL: ProposalData = {
  companyName: "Sua Empresa",
  companyInitial: "S",
  proposalNumber: "0001",
  accent: "#C9A876",

  clientName: "Cliente Exemplo",
  clientLegalName: "Cliente Exemplo Ltda.",

  dateLabel: "30 de maio de 2026",
  validUntilLabel: "29 de junho de 2026",
  validUntilShort: "29/06/2026",

  headlineLead:
    "Um plano claro, sob medida para o momento atual da sua operação — desenhado a partir do que conversamos.",

  challengeHeading: "Entendemos onde você está hoje.",
  challengeStatement:
    "A sua operação cresceu, mas **os processos não acompanharam o ritmo**. O resultado é previsível: esforço disperso, custo de aquisição subindo e dificuldade de enxergar com clareza o que realmente move o ponteiro. Esta proposta nasce exatamente desses pontos.",
  pains: [
    {
      title: "Aquisição cara",
      description:
        "O custo de trazer cada novo cliente cresceu e a margem sente o impacto mês a mês.",
    },
    {
      title: "Falta de previsibilidade",
      description:
        "Sem um funil estruturado, o resultado oscila e o planejamento vira aposta.",
    },
    {
      title: "Execução fragmentada",
      description:
        "Iniciativas soltas, sem um fio condutor que conecte esforço a resultado.",
    },
  ],

  solutionsHeading: "As soluções que propomos.",
  solutionsNote: "Cada frente endereça diretamente um dos desafios acima.",
  solutions: [
    {
      title: "Solução 1",
      description:
        "Descreva aqui a primeira solução: o que é, como funciona e qual problema do cliente ela resolve. Mantenha objetivo e concreto.",
      features: [
        "Entregável ou benefício principal",
        "Segundo entregável relevante",
        "Terceiro ponto de valor",
      ],
    },
    {
      title: "Solução 2",
      description:
        "Descreva a segunda solução. A ideia é que cada bloco seja totalmente preenchível — título, descrição e itens de entrega — para servir a qualquer empresa.",
      features: [
        "Entregável ou benefício principal",
        "Segundo entregável relevante",
        "Terceiro ponto de valor",
      ],
    },
    {
      title: "Solução 3",
      description:
        "Descreva a terceira solução. O número de soluções é flexível — adicione ou remova conforme o escopo da proposta.",
      features: [
        "Entregável ou benefício principal",
        "Segundo entregável relevante",
        "Terceiro ponto de valor",
      ],
    },
  ],

  investHeading: "Escolha o nível ideal.",
  tiers: [
    {
      name: "Starter",
      price: "R$ 2.997",
      priceSuffix: "/mês",
      description: "Ideal para começar com o essencial.",
      features: ["Inclui a Solução 1", "Suporte por e-mail", "Relatório mensal"],
    },
    {
      name: "Scale",
      price: "R$ 4.997",
      priceSuffix: "/mês",
      description: "O equilíbrio entre escopo e resultado.",
      features: [
        "Soluções 1 e 2",
        "Suporte prioritário",
        "Reunião quinzenal",
        "Dashboard de acompanhamento",
      ],
      featured: true,
    },
    {
      name: "Enterprise",
      price: "R$ 7.497",
      priceSuffix: "/mês",
      description: "Operação completa, sob medida.",
      features: [
        "Todas as soluções",
        "Gerente dedicado",
        "Reunião semanal",
        "SLA personalizado",
      ],
    },
  ],

  closingHeading: "Vamos começar?",
  closingLead:
    "Estamos prontos para colocar este plano em prática. O próximo passo é uma conversa para alinhar os detalhes e dar o start.",
  ctaLabel: "Aprovar proposta",
  responsible: "Nome do Closer",
  phone: "(00) 00000-0000",
  email: "contato@suaempresa.com",
};
