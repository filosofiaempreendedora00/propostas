// Mapeamento catálogo → proposta. Fonte única para o builder (Gerador) e para
// os previews de seção (Sua Empresa), evitando divergência de renderização.
import type { Solution, Tier } from "./types";
import type { CatalogSolution, SolutionPlan } from "@/lib/catalog/types";

export function toRenderSolution(s: CatalogSolution): Solution {
  return {
    name: s.name,
    problemSolved: s.problemSolved,
    howItWorks: s.howItWorks,
    expectedBenefit: s.expectedBenefit,
    deliverables: s.deliverables,
    timeline: s.timeline,
    highlights: s.highlights,
    requirements: s.requirements,
  };
}

export function planToTier(p: SolutionPlan): Tier {
  return {
    name: p.name,
    price: p.price,
    priceSuffix: p.billing === "recorrente" ? "/mês" : "",
    billing: p.billing,
    description: p.description,
    features: p.features,
    featured: p.featured,
  };
}
