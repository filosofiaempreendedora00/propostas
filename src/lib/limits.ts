// Travas anti-abuso por organização. Generosas para uso real, mortais para abuso.
export const LIMITS = {
  solutions: 200,
  plansPerSolution: 25,
  consultants: 100,
  templates: 200,
  // Logo guardado como data URL base64 no banco. ~700 KB de base64 ≈ ~500 KB de imagem.
  logoBytes: 700_000,
} as const;

// Freemium: downloads de proposta grátis (total) antes de exigir assinatura.
export const FREE_DOWNLOADS = 3;

// Gerações de catálogo por IA permitidas por organização (anti-abuso).
export const FREE_AI_GENERATIONS = 3;

export class LimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LimitError";
  }
}
