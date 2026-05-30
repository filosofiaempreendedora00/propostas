// Catálogo de soluções da empresa (ambiente "Sua Empresa").
// Cadastrado uma vez e reaproveitado modularmente nas propostas.

export interface CatalogSolution {
  id: string;
  icon: string; // emoji
  name: string;
  tagline: string; // resumo de uma linha
  description: string; // descrição completa (parágrafo)
  scope: string[]; // o que está incluído
  deliverables: string[]; // entregáveis concretos
  timeline: string; // prazo de execução (ex: "30 dias úteis")
  highlights: string[]; // diferenciais / destaques
  requirements: string[]; // o que precisamos do cliente
  notes: string; // observações internas (não vão pra proposta)
}
