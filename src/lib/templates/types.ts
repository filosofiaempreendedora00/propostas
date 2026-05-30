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
  { key: "strategy", label: "Estratégia", n: 4 },
  { key: "solutions", label: "Soluções (intro)", n: 5 },
  { key: "consultantRec", label: "Recomendação", n: 7 },
  { key: "nextSteps", label: "Próximos passos", n: 8 },
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
  cost: ["costQuestion", "costOperational", "costFinancial", "costStrategic"],
  strategy: ["strategyHeading", "strategyIntro", "pillars"],
  solutions: ["solutionsHeading", "solutionsNote"],
  consultantRec: [
    "consultantRecHeading",
    "consultantRecText",
    "consultantRecReasons",
  ],
  nextSteps: ["nextStepsHeading", "steps"],
};
