import type { ProposalData } from "./types";

export const DEFAULT_PROPOSAL: ProposalData = {
  companyName: "Sua Empresa",
  companyInitial: "S",
  proposalNumber: "0001",
  showProposalNumber: true,
  accent: "#C9A876",

  // Vazios de propósito: obrigatórios (evita vazar exemplo).
  clientName: "",
  clientLegalName: "",
  dateLabel: "30 de maio de 2026",
  validUntilLabel: "29 de junho de 2026",
  coverEyebrow: "Preparado exclusivamente para você",
  coverHeadline: "Uma proposta para impulsionar a",
  headlineLead:
    "Um plano claro, sob medida para o momento atual da sua operação — desenhado a partir do que conversamos.",

  // 2. O que entendemos
  understandingHeading: "Entendemos o seu momento.",
  currentSituation:
    "A operação cresceu de forma consistente, mas a estrutura e os processos ainda acompanham o ritmo de antes.",
  mainBottleneck:
    "O principal bloqueio hoje é a dependência de esforço manual, que limita a previsibilidade e a escala.",
  opportunity:
    "Há uma base sólida pronta para crescer — falta apenas o sistema certo para destravar esse potencial.",
  objective:
    "Crescer com previsibilidade, reduzindo o custo de aquisição e ganhando eficiência operacional.",

  // 3. O custo de continuar igual
  costQuestion: "O que acontece se nada mudar?",
  costOperational:
    "A equipe segue operando no limite, apagando incêndios em vez de construir o que escala.",
  costFinancial:
    "O custo de aquisição continua subindo e a margem é corroída mês após mês.",
  costStrategic:
    "Oportunidades de crescimento seguem sendo desperdiçadas e a concorrência ganha terreno.",

  // Visibilidade de blocos (olho) — padrão: todos visíveis
  showUnderstanding: true,
  showCost: true,
  showStrategy: true,
  showSolutions: true,
  showInvestment: true,
  showConsultantRec: true,
  showNextSteps: true,

  // 4. Estratégia recomendada
  strategyHeading: "A estratégia antes da execução.",
  strategyIntro:
    "Antes de falar de serviços, este é o raciocínio que guia a recomendação — você compra estratégia; os serviços são a execução dela.",
  pillars: [
    {
      title: "Aquisição",
      description:
        "Construir um motor de geração de demanda previsível, com canais e mensagem certos para o seu público.",
    },
    {
      title: "Conversão",
      description:
        "Transformar interesse em receita com um funil estruturado e pontos de fricção removidos.",
    },
    {
      title: "Retenção",
      description:
        "Aumentar o valor de cada cliente ao longo do tempo, reduzindo a dependência de aquisição constante.",
    },
  ],

  // 5. Soluções recomendadas
  solutionsHeading: "Como vamos executar.",
  solutionsNote: "Cada solução resolve um problema específico do diagnóstico.",
  solutions: [],

  // 6. Investimento
  investHeading: "Escolha o nível ideal.",
  investmentGroups: [],
  recommendationReason:
    "Recomendamos o plano em destaque por oferecer o melhor equilíbrio entre velocidade de implementação e retorno esperado para o momento atual da operação.",

  // 7. Recomendação do consultor
  consultantRecHeading: "Nossa recomendação.",
  consultantRecText:
    "Depois de analisar o cenário atual, acreditamos que esta é a opção mais adequada para este momento da sua empresa.",
  consultantRecReasons: [
    "Endereça diretamente o principal gargalo identificado.",
    "Entrega resultado no menor tempo de implementação.",
    "Cria base para escalar sem aumentar o esforço manual.",
  ],

  // 8. Próximos passos
  nextStepsHeading: "Por onde começamos.",
  steps: [
    {
      title: "Aprovação da proposta",
      description: "Você aprova o escopo e o plano escolhido.",
    },
    {
      title: "Kickoff",
      description: "Alinhamos detalhes, acessos e cronograma com o seu time.",
    },
    {
      title: "Início da implementação",
      description: "Colocamos a estratégia em prática desde a primeira semana.",
    },
  ],
  ctaLabel: "Aprovar proposta",

  responsible: "Nome do Consultor",
  phone: "(00) 00000-0000",
  email: "contato@suaempresa.com",
};
