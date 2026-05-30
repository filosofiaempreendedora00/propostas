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

// Planos / níveis de investimento (ambiente "Sua Empresa").
// Vinculados às soluções: as features do plano derivam das soluções incluídas.
export interface CatalogPlan {
  id: string;
  name: string; // ex: "Starter", "Scale"
  price: string; // ex: "R$ 4.997"
  priceSuffix: string; // ex: "/mês"
  description: string; // subtítulo curto do plano
  featured: boolean; // destaque "Recomendado"
  solutionIds: string[]; // soluções incluídas (link inteligente)
  extraFeatures: string[]; // itens adicionais além das soluções
}
