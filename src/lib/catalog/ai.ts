import "server-only";

import { randomUUID } from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import type { CatalogSolution, SolutionPlan, Billing } from "./types";

// Geração de catálogo por IA a partir de uma descrição curta do negócio.
// Modelo barato (Haiku) — é geração estruturada, ~centavos por catálogo.
const MODEL = "claude-haiku-4-5";

// Saída ESTRUTURADA: o modelo é forçado a responder neste JSON Schema, então o
// shape sempre bate. Restrições do structured outputs respeitadas:
// additionalProperties:false em todo objeto, sem min/maxLength e sem recursão.
const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    solutions: {
      type: "array",
      description: "2 a 3 soluções comerciais reais e específicas do negócio.",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          icon: { type: "string", description: "Um emoji que representa a solução." },
          name: { type: "string", description: "Nome comercial concreto (NÃO 'Solução 1')." },
          tagline: { type: "string", description: "Resumo de uma linha, vendedor." },
          problemSolved: { type: "string", description: "A dor concreta que elimina." },
          howItWorks: { type: "string", description: "Como funciona, em 2-3 frases claras." },
          expectedBenefit: { type: "string", description: "Resultado tangível/mensurável." },
          deliverables: {
            type: "array",
            description: "3 a 5 entregáveis concretos.",
            items: { type: "string" },
          },
          timeline: { type: "string", description: "Prazo realista, ex: '30 dias úteis'." },
          highlights: {
            type: "array",
            description: "1 a 3 diferenciais que valem destaque.",
            items: { type: "string" },
          },
          requirements: {
            type: "array",
            description: "1 a 3 coisas que a empresa precisa do cliente.",
            items: { type: "string" },
          },
          scope: {
            type: "array",
            description: "2 a 4 itens de escopo (uso interno).",
            items: { type: "string" },
          },
          notes: { type: "string", description: "Observação interna curta (uso interno)." },
          plans: {
            type: "array",
            description:
              "2 a 3 planos com ANCORAGEM de preço (um mais caro, um intermediário 'recomendado').",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                name: { type: "string", description: "Nome do plano (ex: 'Essencial', 'Pro')." },
                billing: {
                  type: "string",
                  enum: ["recorrente", "pontual"],
                  description: "recorrente = mensal; pontual = projeto único.",
                },
                price: { type: "string", description: "Preço no formato 'R$ X.XXX'." },
                description: { type: "string", description: "Descrição curta do plano." },
                features: {
                  type: "array",
                  description: "3 a 5 itens inclusos no plano.",
                  items: { type: "string" },
                },
                featured: { type: "boolean", description: "true só no plano recomendado." },
              },
              required: ["name", "billing", "price", "description", "features", "featured"],
            },
          },
        },
        required: [
          "icon", "name", "tagline", "problemSolved", "howItWorks",
          "expectedBenefit", "deliverables", "timeline", "highlights",
          "requirements", "scope", "notes", "plans",
        ],
      },
    },
    consultant: {
      type: "object",
      additionalProperties: false,
      description: "Um consultor/responsável comercial coerente com o nicho.",
      properties: {
        name: { type: "string", description: "Nome próprio plausível do responsável." },
        role: { type: "string", description: "Cargo coerente, ex: 'Consultor de Marketing'." },
      },
      required: ["name", "role"],
    },
  },
  required: ["solutions", "consultant"],
} as const;

const SYSTEM_PROMPT = `Você é um copywriter sênior de propostas comerciais B2B no Brasil. A partir de uma descrição curta de um negócio, você gera o CATÁLOGO de soluções da empresa — pronto para virar uma proposta que fecha venda.

REGRAS:
- Escreva em português do Brasil, no tom do nicho descrito (uma agência de tráfego soa diferente de uma consultoria jurídica).
- Seja ESPECÍFICO e PERSUASIVO, no nível de uma proposta real. Nada genérico, nada de "Solução 1", nada de placeholders.
- Gere 2 a 3 soluções coerentes com o que o negócio vende. Cada uma com 2 a 3 planos.
- Siga a lógica de uma boa proposta: diagnóstico do problema → como funciona → benefício tangível → entregáveis concretos → planos com ANCORAGEM de preço (um plano mais caro que faz o do meio parecer a melhor escolha; marque featured=true só no plano "recomendado", normalmente o do meio).
- Preços realistas para o mercado brasileiro, no formato "R$ X.XXX". Use recorrente (mensal) para serviços contínuos e pontual para projetos fechados.
- Benefícios de preferência mensuráveis (prazos, percentuais, números) quando fizer sentido — sem inventar garantias absurdas.
- Preencha TODOS os campos. Zero campo vazio.
- Para o consultor: gere um nome próprio plausível e um cargo coerente. NÃO invente e-mail ou telefone — o dono preenche o contato real depois.`;

export type GeneratedConsultant = { name: string; role: string };

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" && v.trim() ? v.trim() : fallback;
}
function strList(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => str(x)).filter(Boolean);
}

function normalizePlans(raw: unknown): SolutionPlan[] {
  const arr = Array.isArray(raw) ? raw : [];
  const plans: SolutionPlan[] = arr.slice(0, 6).map((p) => {
    const o = (p ?? {}) as Record<string, unknown>;
    const billing: Billing = o.billing === "pontual" ? "pontual" : "recorrente";
    const features = strList(o.features);
    return {
      id: randomUUID(),
      name: str(o.name, "Plano"),
      billing,
      price: str(o.price, "R$ 0"),
      description: str(o.description),
      features: features.length ? features : ["Entrega principal"],
      featured: o.featured === true,
    };
  });
  if (plans.length === 0) return [];
  // Garante exatamente UM plano em destaque (ancoragem).
  const featuredCount = plans.filter((p) => p.featured).length;
  if (featuredCount !== 1) {
    plans.forEach((p) => (p.featured = false));
    plans[Math.min(1, plans.length - 1)].featured = true; // o do meio, quando houver
  }
  return plans;
}

// Chama a IA e devolve o catálogo já validado/normalizado no shape do app.
export async function generateCatalogFromBrief(
  brief: string,
): Promise<{ solutions: CatalogSolution[]; consultant: GeneratedConsultant }> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    throw new Error(
      "Geração por IA indisponível: falta configurar ANTHROPIC_API_KEY no servidor.",
    );
  }
  const clean = (brief ?? "").trim().slice(0, 2000);
  if (clean.length < 20) {
    throw new Error("Descreva seu negócio com um pouco mais de detalhe (o que vende, pra quem).");
  }

  const client = new Anthropic({ apiKey: key });
  const resp = await client.messages.create({
    model: MODEL,
    max_tokens: 8000,
    system: SYSTEM_PROMPT,
    output_config: { format: { type: "json_schema", schema: SCHEMA } },
    messages: [
      {
        role: "user",
        content: `Descrição do negócio:\n"""\n${clean}\n"""\n\nGere o catálogo completo seguindo as regras.`,
      },
    ],
  });

  const text = resp.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();

  let data: { solutions?: unknown[]; consultant?: Record<string, unknown> };
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("A IA retornou um formato inesperado. Tente gerar de novo.");
  }

  const rawSolutions = Array.isArray(data.solutions) ? data.solutions : [];
  const solutions: CatalogSolution[] = rawSolutions.slice(0, 4).map((s) => {
    const o = (s ?? {}) as Record<string, unknown>;
    const deliverables = strList(o.deliverables);
    return {
      id: randomUUID(),
      icon: str(o.icon, "✦").slice(0, 2),
      name: str(o.name, "Solução"),
      tagline: str(o.tagline),
      problemSolved: str(o.problemSolved),
      howItWorks: str(o.howItWorks),
      expectedBenefit: str(o.expectedBenefit),
      deliverables: deliverables.length ? deliverables : ["Entregável principal"],
      plans: normalizePlans(o.plans),
      scope: strList(o.scope),
      timeline: str(o.timeline, "30 dias úteis"),
      highlights: strList(o.highlights),
      requirements: strList(o.requirements),
      notes: str(o.notes),
    };
  });

  if (solutions.length === 0) {
    throw new Error("A IA não conseguiu gerar soluções. Tente descrever o negócio com mais detalhe.");
  }

  const c = (data.consultant ?? {}) as Record<string, unknown>;
  const consultant: GeneratedConsultant = {
    name: str(c.name, "Consultor"),
    role: str(c.role, "Consultor"),
  };

  return { solutions, consultant };
}
