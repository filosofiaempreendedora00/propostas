// Travas anti-abuso por organização. Generosas para uso real, mortais para abuso.
export const LIMITS = {
  solutions: 200,
  plansPerSolution: 25,
  consultants: 100,
  templates: 200,
  // Logo guardado como data URL base64 no banco. ~700 KB de base64 ≈ ~500 KB de imagem.
  logoBytes: 700_000,
} as const;

export class LimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LimitError";
  }
}
