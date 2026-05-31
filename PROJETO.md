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
- [x] **Passo 1 — Visual**: template universal sofisticado (HTML estático) aprovado pelo Roberto.
- [~] **Passo 2 — App** (Next.js 16 + React 19 + TS + Tailwind 4):
  - [x] Scaffold + modelo de dados (`src/lib/proposal/`) + renderizador (`render.ts`)
  - [x] Builder: formulário completo + preview ao vivo (iframe) + export HTML standalone
  - [x] Cor de acento trocável (presets) — fundação pro "modelo personalizado"
  - [ ] Persistência (Postgres/Drizzle): salvar/listar/editar propostas — passo dedicado
- [ ] **Passo 3 — IA**: porta a inteligência (DIFF, audit, agentic) pra personalizar a partir de briefing.
- [ ] **Futuro**: modelo personalizado com cores/branding do cliente; export PDF; telemetria.

## Como rodar o app
```bash
cd "/Users/roberto/Projetos do Claude/Propostas"
npm install   # primeira vez
npm run dev   # http://localhost:3000
```

## Arquitetura (passo 2)
**Menu lateral colapsável** (Sidebar, ícones) com dois ambientes:
- **`/empresa` (Sua Empresa)** — workspace com sub-abas **Soluções**, **Planos** e **Consultores**:
  - *Soluções*: catálogo cadastrado UMA vez (escopo, entregáveis, prazo, destaques, requisitos).
  - *Planos*: níveis de investimento (preço + **soluções vinculadas** + itens extras).
    Vínculo inteligente → as features do plano derivam das soluções incluídas.
  - *Consultores*: nome, e-mail, telefone — puxados na proposta.
  - Master-detail com auto-save.
- **`/templates` (Templates)** — biblioteca de **variações por bloco** (2,3,4,5,7,8). Abas por
  bloco; cada um começa com 3 variações e a pessoa cria quantas quiser. Editor mostra os campos
  específicos do bloco (ex.: pilares na Estratégia, passos em Próximos passos). Store em
  `src/lib/templates/` (localStorage). **Integrado ao builder**: cada bloco no Seu Cliente tem
  "Carregar variação" (aplica) e "+ salvar atual" (cria nova variação reutilizável).
- **`/cliente` (Seu Cliente)** — monta a proposta. O painel esquerdo tem só **controles**
  (seleção de soluções/planos, consultor via drag-and-drop, estrutura das dores, aparência).
  Os **textos editam-se direto no preview** (edição inline: hover tracejado → clique → edita
  no lugar; sai → salva). Não-editáveis inline: soluções, planos e consultor (vêm dos catálogos).
  Preview ao vivo + export.

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
- `src/lib/catalog/types.ts` — `CatalogSolution`, `CatalogPlan`.
- `src/lib/catalog/store.ts` — `useCatalog()` (soluções) e `usePlans()` (planos), localStorage
  (camada isolada; trocar por API/Postgres depois).
- `src/lib/proposal/{types,defaults,render}.ts` — `renderProposalHTML(data)`: HTML standalone
  (fonte única pro preview e export). Estratégia herdada do Octopus: 1 função monta tudo.
- `src/app/_components/` — `Sidebar`, `EmpresaWorkspace` (sub-abas), `CatalogManager` (soluções),
  `PlansManager` (planos), `ClientBuilder` (cliente), `fields` (inputs compartilhados).

> Persistência atual = localStorage (cadastro do catálogo sobrevive a reload). Migração pra
> Postgres/Drizzle fica no passo dedicado de banco.

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
