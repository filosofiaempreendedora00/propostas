// Preço da API da Anthropic por 1M de tokens (USD), por modelo.
// Fonte única de verdade para calcular o custo das gerações no painel admin.
export const AI_PRICES: Record<string, { in: number; out: number }> = {
  "claude-haiku-4-5": { in: 1, out: 5 },
};

// Custo em USD de uma geração, a partir dos tokens de entrada/saída.
export function aiCostUsd(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const p = AI_PRICES[model] ?? AI_PRICES["claude-haiku-4-5"];
  return (inputTokens * p.in + outputTokens * p.out) / 1_000_000;
}

// Cotação aproximada só para EXIBIÇÃO em R$. O valor exato cobrado é em USD.
export const USD_BRL = 5.45;
