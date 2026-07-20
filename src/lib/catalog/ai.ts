import "server-only";

import { randomUUID } from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import type { ProposalData } from "@/lib/proposal/types";
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
      description:
        "2 a 3 soluções reais e específicas — os produtos/serviços que o REMETENTE (o negócio descrito) vende ao cliente dele.",
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
        role: { type: "string", description: "Cargo coerente com o negócio descrito (ex.: 'Especialista', 'Responsável Comercial')." },
      },
      required: ["name", "role"],
    },
    blocks: {
      type: "object",
      additionalProperties: false,
      description:
        "Os blocos NARRATIVOS de persuasão da proposta, coerentes com as soluções acima e com o negócio descrito. Específicos, no tom do nicho, nada genérico.",
      properties: {
        // Bloco 2 — O que entendemos (diagnóstico)
        understandingHeading: {
          type: "string",
          description: "Título curto do diagnóstico (ex.: 'Entendemos o seu momento.').",
        },
        currentSituation: {
          type: "string",
          description: "A situação atual do DESTINATÁRIO (o cliente potencial do remetente), concreta e reconhecível (1-2 frases).",
        },
        mainBottleneck: {
          type: "string",
          description: "O principal gargalo/bloqueio que trava o crescimento hoje.",
        },
        opportunity: {
          type: "string",
          description: "A oportunidade clara que existe ao destravar esse gargalo.",
        },
        objective: {
          type: "string",
          description: "O objetivo concreto que a proposta busca alcançar.",
        },
        // Bloco 3 — O custo de continuar igual (urgência)
        costQuestion: {
          type: "string",
          description: "Pergunta que cria urgência (ex.: 'O que acontece se nada mudar?').",
        },
        costOperational: {
          type: "string",
          description: "O custo OPERACIONAL de não agir (tempo, esforço manual, equipe no limite).",
        },
        costFinancial: {
          type: "string",
          description: "O custo FINANCEIRO de não agir (margem, receita perdida, CAC subindo).",
        },
        costStrategic: {
          type: "string",
          description: "O custo ESTRATÉGICO de não agir (concorrência, posição de mercado).",
        },
        // Bloco 4 — Estratégia (convicção)
        strategyHeading: {
          type: "string",
          description: "Título da estratégia (ex.: 'A estratégia antes da execução.').",
        },
        strategyIntro: {
          type: "string",
          description: "Introdução que enquadra o raciocínio antes de falar de serviços.",
        },
        pillars: {
          type: "array",
          description: "3 pilares da estratégia recomendada.",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              title: { type: "string", description: "Nome curto do pilar." },
              description: { type: "string", description: "O que esse pilar faz, 1-2 frases." },
            },
            required: ["title", "description"],
          },
        },
        // Bloco 7 — Recomendação do consultor (decisão)
        consultantRecHeading: {
          type: "string",
          description: "Título da recomendação (ex.: 'Nossa recomendação.').",
        },
        consultantRecText: {
          type: "string",
          description: "Parágrafo de recomendação, confiante e consultivo.",
        },
        consultantRecReasons: {
          type: "array",
          description: "3 motivos objetivos que sustentam a recomendação.",
          items: { type: "string" },
        },
        // Bloco 8 — Próximos passos
        nextStepsHeading: {
          type: "string",
          description: "Título dos próximos passos (ex.: 'Por onde começamos.').",
        },
        steps: {
          type: "array",
          description: "3 passos de início, na ordem (aprovação → kickoff → execução).",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              title: { type: "string", description: "Nome curto do passo." },
              description: { type: "string", description: "O que acontece nesse passo, 1 frase." },
            },
            required: ["title", "description"],
          },
        },
      },
      required: [
        "understandingHeading", "currentSituation", "mainBottleneck", "opportunity", "objective",
        "costQuestion", "costOperational", "costFinancial", "costStrategic",
        "strategyHeading", "strategyIntro", "pillars",
        "consultantRecHeading", "consultantRecText", "consultantRecReasons",
        "nextStepsHeading", "steps",
      ],
    },
  },
  required: ["solutions", "consultant", "blocks"],
} as const;

const SYSTEM_PROMPT = `Você é um copywriter sênior de propostas comerciais no Brasil. A partir de uma descrição curta de um negócio, você escreve a PROPOSTA COMERCIAL COMPLETA que ESSE negócio vai ENVIAR para conquistar um cliente — catálogo de soluções + blocos narrativos de persuasão.

PAPÉIS — leia com atenção, errar isto invalida a proposta inteira:
- REMETENTE = o negócio descrito. É quem VAI ENVIAR e ASSINAR esta proposta, e quem VENDE. Você trabalha PARA ele. No texto, ele é "nós".
- DESTINATÁRIO = o CLIENTE POTENCIAL do remetente. É quem vai RECEBER, ler e decidir contratar. É quem COMPRA. No texto, ele é "você". Ainda é genérico nesta etapa (o remetente preenche o nome do cliente depois) — escreva pensando no cliente-TIPO do remetente.
- SOLUÇÕES do catálogo = exatamente os produtos/serviços que o REMETENTE vende, extraídos da descrição. Ex.: "clínica que faz limpeza de pele e botox" → soluções como limpeza de pele, aplicação de botox, pacote de skincare (o que a clínica vende a quem a contrata). "escritório de contabilidade" → abertura de empresa, contabilidade mensal, consultoria fiscal.

NUNCA (estes erros quebram a proposta):
- NUNCA inverta os papéis. Não transforme o remetente no comprador. Não invente um TERCEIRO negócio (agência, consultoria de marketing) vendendo PARA o remetente. Se a descrição é uma clínica de estética, a proposta é DA clínica PARA o cliente dela — JAMAIS uma agência vendendo agenda/leads/marketing PARA a clínica.
- NUNCA troque os serviços reais do remetente por serviços genéricos de "crescimento/marketing/tráfego/agenda", a menos que o negócio descrito seja literalmente disso.

REGRAS GERAIS:
- Português do Brasil, no tom do nicho (uma clínica de estética soa diferente de uma consultoria jurídica).
- ESPECÍFICO e PERSUASIVO, no nível de uma proposta real. Nada genérico, nada de "Solução 1", nada de placeholders, nada de encher linguiça.
- Coerência total: os blocos narrativos falam do MESMO remetente e das MESMAS soluções, endereçados ao mesmo cliente-tipo.

CATÁLOGO (solutions + consultant):
- 2 a 3 soluções = o que o REMETENTE vende. Cada uma com 2 a 3 planos.
- Lógica: dor concreta do destinatário → como a solução funciona → benefício tangível → entregáveis concretos → planos com ANCORAGEM de preço (um plano mais caro faz o do meio parecer a melhor escolha; featured=true só no recomendado, normalmente o do meio).
- Preços realistas para o Brasil, "R$ X.XXX". recorrente (mensal) para serviço contínuo, pontual para projeto fechado.
- Benefícios mensuráveis (prazos, %, números) quando fizer sentido — sem garantias absurdas.
- Consultor: nome próprio plausível + cargo coerente com o REMETENTE (numa clínica, algo como 'Especialista'/'Responsável'; numa agência, 'Consultor'). NÃO invente e-mail/telefone — o dono preenche depois.

BLOCOS NARRATIVOS (blocks) — a proposta que o REMETENTE manda ao DESTINATÁRIO:
- understanding (diagnóstico): mostre que o remetente ENTENDE o momento do DESTINATÁRIO. currentSituation = a situação do destinatário (o cliente), reconhecível; mainBottleneck = o que trava ELE hoje; opportunity ao destravar; objective concreto.
- cost (urgência): o custo que o DESTINATÁRIO paga por continuar sem a solução do remetente — os três ângulos (operacional, financeiro, estratégico), concretos, sem drama vazio.
- strategy (convicção): strategyIntro enquadra "você [destinatário] compra a estratégia; os serviços do remetente são a execução dela". 3 pilares nomeados e específicos.
- consultantRec (decisão): o remetente recomendando ao destinatário, confiante e consultivo + 3 motivos ligados ao diagnóstico e às soluções.
- nextSteps: 3 passos sem fricção para começarem a trabalhar juntos (aprovação → kickoff → início da execução).
- Preencha TODOS os campos. Zero campo vazio.`;

export type GeneratedConsultant = { name: string; role: string };
export type GenUsage = {
  model: string;
  inputTokens: number;
  outputTokens: number;
};

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" && v.trim() ? v.trim() : fallback;
}
function strList(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => str(x)).filter(Boolean);
}

// Normaliza os blocos narrativos no shape do ProposalData (só os campos dos
// blocos). O que a IA não mandar cai no default depois (via pickDefault).
function normalizeBlocks(raw: unknown): Partial<ProposalData> {
  const o = (raw ?? {}) as Record<string, unknown>;
  const pairs = (v: unknown): { title: string; description: string }[] => {
    if (!Array.isArray(v)) return [];
    return v
      .map((x) => {
        const p = (x ?? {}) as Record<string, unknown>;
        return { title: str(p.title), description: str(p.description) };
      })
      .filter((p) => p.title || p.description);
  };
  const out: Partial<ProposalData> = {};
  const setStr = (k: keyof ProposalData, v: unknown) => {
    const s = str(v);
    if (s) (out as Record<string, unknown>)[k] = s;
  };
  setStr("understandingHeading", o.understandingHeading);
  setStr("currentSituation", o.currentSituation);
  setStr("mainBottleneck", o.mainBottleneck);
  setStr("opportunity", o.opportunity);
  setStr("objective", o.objective);
  setStr("costQuestion", o.costQuestion);
  setStr("costOperational", o.costOperational);
  setStr("costFinancial", o.costFinancial);
  setStr("costStrategic", o.costStrategic);
  setStr("strategyHeading", o.strategyHeading);
  setStr("strategyIntro", o.strategyIntro);
  const pillars = pairs(o.pillars);
  if (pillars.length) out.pillars = pillars;
  setStr("consultantRecHeading", o.consultantRecHeading);
  setStr("consultantRecText", o.consultantRecText);
  const reasons = strList(o.consultantRecReasons);
  if (reasons.length) out.consultantRecReasons = reasons;
  setStr("nextStepsHeading", o.nextStepsHeading);
  const steps = pairs(o.steps);
  if (steps.length) out.steps = steps;
  return out;
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
export async function generateCatalogFromBrief(brief: string): Promise<{
  solutions: CatalogSolution[];
  consultant: GeneratedConsultant;
  blocks: Partial<ProposalData>;
  usage: GenUsage;
}> {
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
    max_tokens: 16000, // catálogo + blocos narrativos (proposta completa)
    system: SYSTEM_PROMPT,
    output_config: { format: { type: "json_schema", schema: SCHEMA } },
    messages: [
      {
        role: "user",
        content: `Descrição do negócio:\n"""\n${clean}\n"""\n\nEscreva a proposta completa (catálogo + blocos narrativos) seguindo as regras.`,
      },
    ],
  });

  const text = resp.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();

  let data: {
    solutions?: unknown[];
    consultant?: Record<string, unknown>;
    blocks?: unknown;
  };
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

  const blocks = normalizeBlocks(data.blocks);

  // Tokens efetivamente cobrados (entrada + cache contam como input).
  const usage: GenUsage = {
    model: MODEL,
    inputTokens:
      (resp.usage.input_tokens ?? 0) +
      (resp.usage.cache_read_input_tokens ?? 0) +
      (resp.usage.cache_creation_input_tokens ?? 0),
    outputTokens: resp.usage.output_tokens ?? 0,
  };

  return { solutions, consultant, blocks, usage };
}
