<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:kronos-mandate -->
## KRONOS — mandato do dev  (IAra: mandato · IAgo: instruções)

Régua de TODA mudança: **isto move a ATIVAÇÃO / conversão?** Se não move, questione.

**Produto:** SaaS B2B (PT-BR) que gera propostas comerciais persuasivas. Ativo defensável = a metodologia dos 8 blocos (diagnóstico → urgência → autoridade → ancoragem → "o porquê" → compromisso). Já existe IA (Haiku) que preenche o catálogo a partir de uma descrição curta do negócio — `src/lib/catalog/ai.ts`.

**ICP:** vendedor comissionado / autônomo / dono que vende. Serviço B2B, ticket médio/alto, nível técnico baixíssimo, Brasil, desktop.

**Gargalo — foco nº1 = ATIVAÇÃO no 1º uso.** Dado (Clarity + Supabase): o estranho loga, cai em `/inicio` (que vende trabalho manual — 40% dead click) e não chega em `/empresa` (onde estão o catálogo e a IA): 15→4. A IA existe, mas fica escondida. Meta: o novo usuário, sozinho, descreve o negócio → a IA gera o catálogo → vê uma proposta-WOW, sem tocar nos ~30 campos manuais.

**Princípios:** menos fricção sempre (menos campos/passos, mais IA fazendo o trabalho) · reduzir o time-to-value até o aha-moment (a 1ª proposta real) · desktop-first (mobile capta e leva pro desktop) · instrumentar eventos de conversão · a promessa da landing ("a IA escreve") tem que virar entrega.
<!-- END:kronos-mandate -->

