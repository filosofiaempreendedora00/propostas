import type { ProposalData } from "@/lib/proposal/types";

// Blocos narrativos que admitem variações reaproveitáveis.
export type BlockKey =
  | "understanding"
  | "cost"
  | "strategy"
  | "solutions"
  | "consultantRec"
  | "nextSteps";

export interface BlockTemplate {
  id: string;
  block: BlockKey;
  name: string;
  payload: Partial<ProposalData>; // apenas os campos do bloco
}

export const BLOCKS: { key: BlockKey; label: string; n: number }[] = [
  { key: "understanding", label: "O que entendemos", n: 2 },
  { key: "cost", label: "O custo de continuar igual", n: 3 },
  { key: "strategy", label: "Estratégia — pilares", n: 4 },
  { key: "solutions", label: "Soluções da proposta", n: 5 },
  { key: "consultantRec", label: "Recomendação — motivos", n: 7 },
  { key: "nextSteps", label: "Próximos passos", n: 8 },
];

// Blocos da proposta que NÃO têm variações de texto reaproveitáveis
// (aparecem no Templates apenas para referência, em cinza). A Capa vem da
// Identificação e o Investimento vem dos planos do catálogo.
export const NON_EDITABLE_BLOCKS: { n: number; label: string; hint: string }[] = [
  { n: 1, label: "Capa", hint: "vem da Identificação" },
  { n: 6, label: "Investimento", hint: "vem dos planos" },
];

// Campos de ProposalData que pertencem a cada bloco.
export const BLOCK_FIELDS: Record<BlockKey, (keyof ProposalData)[]> = {
  understanding: [
    "understandingHeading",
    "currentSituation",
    "mainBottleneck",
    "opportunity",
    "objective",
  ],
  cost: [
    "costQuestion",
    "costOperationalLabel",
    "costOperational",
    "costFinancialLabel",
    "costFinancial",
    "costStrategicLabel",
    "costStrategic",
  ],
  strategy: ["strategyEyebrow", "strategyHeading", "strategyIntro", "pillars"],
  solutions: ["solutionsHeading", "solutionsNote"],
  consultantRec: [
    "consultantRecHeading",
    "consultantRecText",
    "consultantRecReasons",
  ],
  nextSteps: ["nextStepsHeading", "steps"],
};
