// Seed e construtores dos templates por bloco. Módulo PURO (client + server).

import type { ProposalData } from "@/lib/proposal/types";
import { DEFAULT_PROPOSAL } from "@/lib/proposal/defaults";
import type { BlockTemplate, BlockKey } from "./types";
import { BLOCKS, BLOCK_FIELDS } from "./types";

export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return "tpl-" + Math.abs(Date.now()).toString(36) + Math.random().toString(36).slice(2, 8);
}

// Extrai do default só os campos do bloco.
export function pickDefault(block: BlockKey): Partial<ProposalData> {
  return BLOCK_FIELDS[block].reduce<Partial<ProposalData>>(
    (acc, f) => ({ ...acc, [f]: DEFAULT_PROPOSAL[f] }),
    {},
  );
}

export function blankTemplate(block: BlockKey, name: string): BlockTemplate {
  return { id: uid(), block, name, payload: pickDefault(block) };
}

// 3 variações por bloco no primeiro acesso.
export const SEED_TEMPLATES: BlockTemplate[] = BLOCKS.flatMap((b) => [
  { id: `seed-${b.key}-1`, block: b.key, name: "Padrão", payload: pickDefault(b.key) },
  { id: `seed-${b.key}-2`, block: b.key, name: "Alternativa A", payload: pickDefault(b.key) },
  { id: `seed-${b.key}-3`, block: b.key, name: "Alternativa B", payload: pickDefault(b.key) },
]);
