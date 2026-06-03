# Projeto: Gerador de Propostas Universal (white-label)

> Documento vivo de contexto. Se a conversa do chat se perder, este arquivo recupera o essencial.
> Última atualização: 2026-06-02

## Origem
Recriação (inspirada, **não copiada**) do gerador de propostas do app **Octopus** (Turbo Partners).
Briefing técnico completo do original está em:
`/Users/roberto/Projetos do Claude/IAs do comercial/Jornada Online/BRIEFING_GERADOR_PROPOSTAS.md`

Repositório deste projeto: https://github.com/filosofiaempreendedora00/propostas.git
Pasta local: `/Users/roberto/Projetos do Claude/KRONOS/Propostas`

## Visão
Um **motor universal / white-label** de geração de propostas comerciais. Não é específico
da Turbo — qualquer empresa pode usar. A **inteligência e a estrutura** vêm do gerador da
Turbo (comprovado), mas tudo é genérico e preenchível pelo usuário.

### Princípios
- **Coringa / universal**: "Solução 1, 2, 3..." que o usuário descreve e precifica.
- **Preços-padrão configuráveis** pelo usuário final.
- Seção **"O Desafio"**: mapeia as dores do cliente final → sensação de *"ele me entende!"*.
- Visual **sofisticado**: o **app** veste a identidade **Kronos** (ver seção abaixo); o
  **documento da proposta** segue neutro/white-label (cores do cliente são fase futura).
- Saída: **HTML standalone** portátil (conceito do Octopus).

## Identidade visual (Kronos)
O **app** (chrome) veste a marca **Kronos**. O **documento da proposta** permanece neutro/white-label.

**Paleta** (tokens em `src/app/globals.css`):
| Cor | HEX | Uso |
|---|---|---|
| Ônix Quente | `#150C06` | fundo principal |
| Sépia Profunda | `#2E2017` | cards/superfícies + texto sobre o creme |
| Areia Média | `#A89070` | textos secundários, divisores, destaque/botões (`--color-accent`) |
| Creme | `#F5EFE6` | campos de formulário (aplicação inversa) |
| Branco Puro | `#FFFFFF` | texto principal sobre escuro |

**Tipografia**: **Cormorant** (títulos/display, itálico como ênfase) + **Instrument Sans**
(corpo/interface). Carregadas em `layout.tsx` via `next/font`; `font-display` marca os títulos.

**Assets** (`public/`): `kronos-logo.png` (sidebar; "K" quando recolhida), `kronos-texture-areia.png`
(grão sutil no fundo, sob véu de ônix), `kronos-ponteiro-areia.png` (bullet das listas item-a-item),
`kronos-icone-areia.png` (ícone de precisão). Fontes originais dos ativos em `Ativos Kronos/`
(gitignored — o app usa as cópias em `public/`). O item **Gerador** tem efeito de **areia caindo**
(`.kronos-sand`) sinalizando que é "onde tudo acontece".

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
- [x] **Passo 1 — Visual**: template universal sofisticado (HTML estático) aprovado pelo Roberto.
- [~] **Passo 2 — App** (Next.js 16 + React 19 + TS + Tailwind 4):
  - [x] Scaffold + modelo de dados (`src/lib/proposal/`) + renderizador (`render.ts`)
  - [x] Builder: formulário completo + preview ao vivo (iframe) + export HTML standalone
  - [x] Cor de acento trocável (presets) — fundação pro "modelo personalizado"
  - [x] **Identidade visual Kronos**: paleta, logo, tipografia (Cormorant + Instrument Sans),
    textura de areia. Ver seção "Identidade visual".
  - [x] **Página Início** (onboarding "como funciona") + aba **Gerador** (ex-"Seu Cliente")
    em destaque
  - [x] **Refino de UI**: planos como cards, consultores em grade, Templates com os 8 blocos,
    listas item-a-item (bullet ponteiro), campos creme/sépia, observações internas destacadas
  - [x] **Persistência (Supabase/Drizzle)**: catálogo, consultores e templates no
    Postgres via Server Actions (seed na 1ª carga; estado otimista + escrita debounced).
    Falta persistir a **proposta montada** em si (hoje ainda efêmera no Gerador).
- [ ] **Passo 3 — IA**: porta a inteligência (DIFF, audit, agentic) pra personalizar a partir de briefing.
- [ ] **Futuro**: modelo personalizado com cores/branding do cliente; export PDF; telemetria.

## Como rodar o app
```bash
cd "/Users/roberto/Projetos do Claude/KRONOS/Propostas"
npm install   # primeira vez
npm run dev   # http://localhost:3000
```

> Nota dev: o Turbopack às vezes cacheia o CSS — ao editar `globals.css` e não ver a mudança,
> pare o server, `rm -rf .next` e suba de novo.

## Arquitetura (passo 2)
**Menu lateral colapsável** (Sidebar) com **quatro áreas**: **Início**, **Sua Empresa**,
**Templates** e **Gerador** (esta em destaque visual — "onde tudo acontece").
- **`/inicio` (Início)** — onboarding "como funciona": o caminho em **3 passos** até a promessa
  *"criar propostas sob medida em 60s"*. Configure uma vez (Sua Empresa + Templates) → gere em
  segundos (Gerador). É a **rota raiz** (`/` redireciona pra cá). Componente `HomeWorkspace`.
- **`/empresa` (Sua Empresa)** — sub-abas **Soluções & Planos** e **Consultores**:
  - *Soluções & Planos*: cada solução cadastrada UMA vez; editor em **sub-abas `Detalhes | Planos`**
    (segmented control). Planos como **cards** (recorrente/pontual, preço, descrição, itens,
    "recomendado" destacado). Entregáveis/itens em **lista item-a-item** (bullet = ícone ponteiro
    Kronos). **Observações internas** em caixa destacada ("não vai pra proposta").
  - *Consultores*: **cards 2 por linha** (nome, e-mail, telefone) — puxados na proposta.
  - Master-detail com auto-save no Supabase (debounced).
- **`/templates` (Templates)** — biblioteca de **variações por bloco**. A barra lista **todos os 8
  blocos** da proposta; os **não-editáveis** (Capa nº1, Investimento nº6) aparecem **em cinza**.
  Editáveis: 2,3,4,5,7,8 — cada um começa com 3 variações e a pessoa cria quantas quiser. Editor
  mostra os campos do bloco (pilares na Estratégia, passos em Próximos passos). Store em
  `src/lib/templates/` (Supabase). **Integrado ao Gerador**: cada bloco tem "Selecionar
  variação" (aplica) e "+ salvar atual" (cria nova variação reutilizável).
- **`/cliente` (Gerador, ex-"Seu Cliente")** — monta a proposta. O painel esquerdo tem só
  **controles** (seleção de soluções/planos, consultor via drag-and-drop, estrutura das dores,
  aparência). Os **textos editam-se direto no preview** (inline: hover tracejado → clique → edita
  no lugar; sai → salva). Não-editáveis inline: soluções, planos e consultor (vêm dos catálogos).
  Preview ao vivo + export. (A rota segue `/cliente`; só o rótulo virou "Gerador".)

### Campos obrigatórios e controlados (painel)
- **Nome da empresa (capa)** e **Nome do cliente**: obrigatórios no painel (começam vazios,
  bloqueiam o export até preencher — evita vazar exemplo). Também editáveis no preview, sincronizados.
- **Validade da proposta**: campo de data (`input[type=date]`) → formata pt-BR; não editável no texto.
- **Número da proposta**: opcional via toggle "Mostrar na capa" (`showProposalNumber`), com nº padrão.

### Edição inline (preview)
`render.ts` marca os textos livres com `data-edit="campo"` e injeta um script no HTML que faz
hover/contenteditable e `postMessage` pro app. `ClientBuilder` ouve as mensagens e atualiza o
estado sem recarregar o iframe (`skipRender`). Campos de catálogo ficam sem `data-edit`.

Arquivos:
- `src/lib/catalog/types.ts` — `CatalogSolution` (com `plans: SolutionPlan[]` aninhados).
- `src/lib/db/{schema,client}.ts` — schema Drizzle + client (server-only, pooler).
- `src/lib/catalog/{seed,actions,store}.ts` e `src/lib/templates/{seed,actions,store}.ts`
  — seed compartilhado, **Server Actions** (list/upsert/delete) e os hooks `useCatalog()`/
  `useConsultants()`/`useTemplates()` (mesma interface; persistem no Supabase).
- `src/lib/proposal/{types,defaults,render}.ts` — `renderProposalHTML(data)`: HTML standalone
  (fonte única pro preview e export). Estratégia herdada do Octopus: 1 função monta tudo.
- `src/lib/templates/{types,store}.ts` — variações por bloco (`BLOCKS` editáveis +
  `NON_EDITABLE_BLOCKS`).
- `src/app/_components/` — `Sidebar`, `HomeWorkspace` (Início), `EmpresaWorkspace` (sub-abas),
  `CatalogManager` (soluções+planos), `ConsultantsManager`, `TemplatesWorkspace` + `TemplateEditor`,
  `ClientBuilder` (Gerador), `fields` (inputs compartilhados, incl. `ItemList` com bullet ponteiro).

> Persistência atual = **Supabase (Postgres) via Drizzle + Server Actions**. Catálogo,
> consultores e templates vivem no banco (`.env.local` tem `DATABASE_URL`/`DIRECT_URL`,
> gitignored). Migrations em `drizzle/`. A proposta montada no Gerador ainda é efêmera.

## Filosofia (foco em CONVERSÃO)
O produto NÃO é "mais um gerador de propostas bonitas". É uma ferramenta que ajuda
prestadores, consultores e agências a **fechar mais negócios**. A proposta segue a lógica
psicológica **Diagnóstico → Convicção → Solução → Decisão** (não "Empresa → Serviços → Preço").
Princípio: todo bloco deve responder *"isto ajuda o cliente final a decidir?"*.

## Estrutura da proposta (8 blocos)
1. **Capa** — percepção premium + contexto (empresa, cliente, validade, número opcional).
2. **O que entendemos** — diagnóstico: situação atual, gargalo principal, oportunidade, objetivo.
3. **O custo de continuar igual** — urgência: consequência operacional, financeira, estratégica.
4. **Estratégia recomendada** — convicção: pilares (estratégia antes da execução).
5. **Soluções recomendadas** — cada uma: problema que resolve, como funciona, benefício, entregáveis (catálogo).
6. **Investimento** — planos + justificativa do plano recomendado.
7. **Recomendação do consultor** — "Nossa recomendação" + motivos (reduz indecisão).
8. **Próximos passos** — passos claros (aprovação → kickoff → início) + CTA.

> Inputs de diagnóstico/custo/recomendação são o que mais impacta fechamento — futura camada
> de IA deve ajudar a *construí-los*, não só escrever bonito.
