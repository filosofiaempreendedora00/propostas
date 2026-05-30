# Projeto: Gerador de Propostas Universal (white-label)

> Documento vivo de contexto. Se a conversa do chat se perder, este arquivo recupera o essencial.
> Última atualização: 2026-05-30

## Origem
Recriação (inspirada, **não copiada**) do gerador de propostas do app **Octopus** (Turbo Partners).
Briefing técnico completo do original está em:
`/Users/roberto/Projetos do Claude/IAs do comercial/Jornada Online/BRIEFING_GERADOR_PROPOSTAS.md`

Repositório deste projeto: https://github.com/filosofiaempreendedora00/propostas.git
Pasta local: `/Users/roberto/Projetos do Claude/Propostas`

## Visão
Um **motor universal / white-label** de geração de propostas comerciais. Não é específico
da Turbo — qualquer empresa pode usar. A **inteligência e a estrutura** vêm do gerador da
Turbo (comprovado), mas tudo é genérico e preenchível pelo usuário.

### Princípios
- **Coringa / universal**: "Solução 1, 2, 3..." que o usuário descreve e precifica.
- **Preços-padrão configuráveis** pelo usuário final.
- Seção **"O Desafio"**: mapeia as dores do cliente final → sensação de *"ele me entende!"*.
- Visual **sofisticado e neutro** (sem cores de cliente ainda — fase futura).
- Saída: **HTML standalone** portátil (conceito do Octopus).

## Decisões travadas (2026-05-30)
| Dimensão | Decisão |
|---|---|
| Stack | Modernizar: **Next.js + TypeScript + Postgres/Drizzle** (mesma do projeto UGC do Roberto) |
| Inteligência | Portar do Octopus: estratégia DIFF, audit pass, refinamento agentic |
| Contexto | **Outro negócio / universal** — reaproveita o motor, refaz toda a config |
| Visual | **Do zero**, sofisticado e neutro. Template padrão hardcoded (ID X). |
| Cores do cliente | Fase futura ("modelo personalizado em construção") |
| Preços | Em aberto; usuário final inputa preços-padrão |
| Estrutura | Respeita o padrão Turbo + seção "O Desafio" (dores do cliente) |

## O que torna o motor original "animal" (a portar)
1. **Estratégia DIFF**: extrai ~50 textos editáveis (`t-001`...), IA devolve só os deltas. 10× mais rápido/barato.
2. **Audit pass**: varre o HTML atrás de termos vazados do template e corrige numa 2ª chamada.
3. **Refinamento agentic**: 11 tools (`query`, `update_text`, `remove_element`...) em loop até `finish()`.
4. **Hard replacements** determinísticos + **prompt caching** (`ephemeral`).
5. Saída HTML standalone (CSS inline, imagens base64, sem dependências externas).

## Roadmap
- [ ] **Passo 1 — Visual**: template universal sofisticado (HTML estático) aprovado pelo Roberto.
- [ ] **Passo 2 — App**: scaffold Next.js + TS + Postgres/Drizzle; formulário de input; geração
      determinística (compõe a partir dos inputs, sem IA); export HTML; persistência (CRUD).
- [ ] **Passo 3 — IA**: porta a inteligência (DIFF, audit, agentic) pra personalizar a partir de briefing.
- [ ] **Futuro**: modelo personalizado com cores/branding do cliente; export PDF; telemetria.

## Estrutura da proposta (template padrão)
1. **Capa** — "Proposta para {Cliente}", de {Sua Empresa}, validade.
2. **O Desafio** — dores/contexto do cliente final.
3. **Soluções** — Solução 1..N (título, descrição, features), genéricas e preenchíveis.
4. **Investimento** — pacotes/tiers com preços configuráveis.
5. **Próximos Passos / Fechamento** — contato, validade, CTA.
