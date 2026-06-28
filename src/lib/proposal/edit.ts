import type { ProposalData } from "./types";

// Mensagem de edição inline vinda do preview (postMessage source:'proposal-edit').
export type EditMsg = {
  source?: string;
  field?: string;
  value?: unknown;
  action?: string;
  index?: number;
};

// Aplica uma edição inline sobre um ProposalData (ou parcial — caso dos
// payloads de template). Espelha o mapeamento que o ClientBuilder já faz:
// pillar.i.k / step.i.k / reason.i / campos planos, + ações add/removePillar.
export function applyProposalEdit<T extends Partial<ProposalData>>(
  data: T,
  m: EditMsg,
): T {
  if (m.action === "addPillar") {
    return {
      ...data,
      pillars: [
        ...(data.pillars ?? []),
        { title: "Novo pilar", description: "Descrição." },
      ],
    };
  }
  if (m.action === "removePillar") {
    const idx = Number(m.index);
    return {
      ...data,
      pillars: (data.pillars ?? []).filter((_, j) => j !== idx),
    };
  }
  if (typeof m.field !== "string") return data;
  const field = m.field;
  const value = String(m.value ?? "");

  if (field.startsWith("pillar.")) {
    const [, i, k] = field.split(".");
    const idx = Number(i);
    return {
      ...data,
      pillars: (data.pillars ?? []).map((p, j) =>
        j === idx ? { ...p, [k]: value } : p,
      ),
    };
  }
  if (field.startsWith("step.")) {
    const [, i, k] = field.split(".");
    const idx = Number(i);
    return {
      ...data,
      steps: (data.steps ?? []).map((s, j) =>
        j === idx ? { ...s, [k]: value } : s,
      ),
    };
  }
  if (field.startsWith("reason.")) {
    const [, i] = field.split(".");
    const idx = Number(i);
    return {
      ...data,
      consultantRecReasons: (data.consultantRecReasons ?? []).map((r, j) =>
        j === idx ? value : r,
      ),
    };
  }
  return { ...data, [field]: value };
}
