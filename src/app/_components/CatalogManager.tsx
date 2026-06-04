"use client";

import { useEffect, useMemo, useState } from "react";
import { useCatalog, blankSolutionPlan } from "@/lib/catalog/store";
import type { SolutionPlan, Billing } from "@/lib/catalog/types";
import type { ProposalData } from "@/lib/proposal/types";
import type { PreviewBlock } from "@/lib/proposal/render";
import { toRenderSolution, planToTier } from "@/lib/proposal/fromCatalog";
import { Label, TextInput, TextArea, ItemList, MiniBtn } from "./fields";
import SectionPreview from "./SectionPreview";

type EditorTab = "detalhes" | "planos";

export default function CatalogManager() {
  const { items, ready, add, update, remove } = useCatalog();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<EditorTab>("detalhes");

  // Seleciona o primeiro item assim que o catálogo carrega.
  useEffect(() => {
    if (ready && selectedId === null && items.length > 0) {
      setSelectedId(items[0].id);
    }
    // Se o item selecionado foi removido, cai pro primeiro.
    if (selectedId && !items.some((s) => s.id === selectedId)) {
      setSelectedId(items[0]?.id ?? null);
    }
  }, [ready, items, selectedId]);

  const selected = items.find((s) => s.id === selectedId) ?? null;

  const handleAdd = () => {
    const id = add();
    setSelectedId(id);
  };

  // Preview ao vivo da seção correspondente à aba aberta:
  // Detalhes → bloco "Soluções"; Planos → bloco "Investimento".
  const previewBlock: PreviewBlock = tab === "planos" ? "investment" : "solutions";
  const previewPayload = useMemo<Partial<ProposalData> | null>(() => {
    if (!selected) return null;
    if (tab === "planos") {
      if (selected.plans.length === 0) return null;
      return {
        investmentGroups: [
          {
            solution: selected.name || "Solução",
            plans: selected.plans.map(planToTier),
          },
        ],
      };
    }
    return { solutions: [toRenderSolution(selected)] };
  }, [selected, tab]);

  return (
    <div className="grid h-full grid-cols-[260px_minmax(420px,1.2fr)_minmax(300px,1fr)]">
      {/* Lista */}
      <aside className="form-scroll overflow-y-auto border-r border-line">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-bg/95 px-4 py-4 backdrop-blur">
          <div>
            <div className="font-display text-3xl font-semibold tracking-tight text-ink">
              Soluções
            </div>
            <div className="text-[11px] text-ink-mute">
              {items.length} cadastrada(s)
            </div>
          </div>
          <button
            onClick={handleAdd}
            className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-bg transition hover:opacity-90"
          >
            + Nova
          </button>
        </div>

        <ul className="p-2">
          {items.map((s) => {
            const active = s.id === selectedId;
            return (
              <li key={s.id}>
                <button
                  onClick={() => setSelectedId(s.id)}
                  className={`mb-1 flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition ${
                    active ? "bg-panel" : "hover:bg-panel/60"
                  }`}
                >
                  <span className="text-lg leading-none">{s.icon || "✦"}</span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-ink">
                      {s.name || "Sem nome"}
                    </span>
                    <span className="block truncate text-xs text-ink-mute">
                      {s.tagline || "Sem resumo"}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
          {ready && items.length === 0 && (
            <li className="px-3 py-8 text-center text-xs text-ink-mute">
              Nenhuma solução. Clique em <strong>+ Nova</strong>.
            </li>
          )}
        </ul>
      </aside>

      {/* Editor */}
      <section className="form-scroll overflow-y-auto">
        {selected ? (
          <div className="mx-auto max-w-4xl px-10 py-9">
            <div className="mb-7 flex items-start justify-between gap-4 border-b border-line pb-5">
              <div className="flex items-center gap-4">
                <input
                  value={selected.icon}
                  onChange={(e) =>
                    update(selected.id, { icon: e.target.value.slice(0, 2) })
                  }
                  className="h-14 w-14 shrink-0 rounded-xl border border-line bg-panel-2 text-center text-2xl outline-none transition focus:border-accent/70"
                  aria-label="Ícone"
                />
                <div>
                  <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-accent">
                    Editando solução
                  </div>
                  <div className="mt-0.5 font-display text-2xl font-semibold tracking-tight text-ink">
                    {selected.name || "Sem nome"}
                  </div>
                </div>
              </div>
              <MiniBtn danger onClick={() => remove(selected.id)}>
                excluir
              </MiniBtn>
            </div>

            <EditorTabs
              tab={tab}
              onChange={setTab}
              planCount={selected.plans.length}
            />

            {tab === "detalhes" ? (
            <div className="space-y-5">
              <label className="block">
                <Label>Nome da solução</Label>
                <TextInput
                  value={selected.name}
                  onChange={(v) => update(selected.id, { name: v })}
                  placeholder="Ex: Gestão de Tráfego Pago"
                />
              </label>

              <label className="block">
                <Label>Resumo (uma linha)</Label>
                <TextInput
                  value={selected.tagline}
                  onChange={(v) => update(selected.id, { tagline: v })}
                  placeholder="Frase curta que aparece no card e na seleção"
                />
              </label>

              <label className="block">
                <Label>O problema que resolve</Label>
                <TextArea
                  value={selected.problemSolved}
                  onChange={(v) => update(selected.id, { problemSolved: v })}
                  rows={2}
                  placeholder="Qual dor concreta do cliente esta solução elimina."
                />
              </label>

              <div className="grid grid-cols-2 gap-5">
                <label className="block">
                  <Label>Como funciona</Label>
                  <TextArea
                    value={selected.howItWorks}
                    onChange={(v) => update(selected.id, { howItWorks: v })}
                    rows={3}
                    placeholder="Como a solução funciona na prática."
                  />
                </label>
                <label className="block">
                  <Label>Benefício esperado</Label>
                  <TextArea
                    value={selected.expectedBenefit}
                    onChange={(v) =>
                      update(selected.id, { expectedBenefit: v })
                    }
                    rows={3}
                    placeholder="O resultado tangível esperado."
                  />
                </label>
              </div>

              <div className="block">
                <Label>Entregáveis</Label>
                <ItemList
                  value={selected.deliverables}
                  onChange={(v) => update(selected.id, { deliverables: v })}
                  placeholder="Descreva um entregável"
                  addLabel="+ adicionar entregável"
                />
              </div>

              <label className="block">
                <Label>Prazo de execução</Label>
                <TextInput
                  value={selected.timeline}
                  onChange={(v) => update(selected.id, { timeline: v })}
                  placeholder="Ex: 30 dias úteis"
                />
              </label>

              <div className="grid grid-cols-2 gap-5">
                <div className="block">
                  <Label>Destaques</Label>
                  <ItemList
                    value={selected.highlights}
                    onChange={(v) => update(selected.id, { highlights: v })}
                    placeholder="Um diferencial que vale destacar"
                    addLabel="+ adicionar destaque"
                  />
                </div>
                <div className="block">
                  <Label>Precisamos do cliente</Label>
                  <ItemList
                    value={selected.requirements}
                    onChange={(v) => update(selected.id, { requirements: v })}
                    placeholder="Acesso ou material necessário"
                    addLabel="+ adicionar item"
                  />
                </div>
              </div>

              <div className="rounded-xl border border-dashed border-line bg-panel/40 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4 text-ink-mute"
                    aria-hidden
                  >
                    <path d="M9.9 4.24A9.1 9.1 0 0 1 12 4c7 0 10 8 10 8a18 18 0 0 1-2.16 3.19M6.6 6.6A18 18 0 0 0 2 12s3 8 10 8a9 9 0 0 0 5.4-1.6" />
                    <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2M2 2l20 20M14 12a2 2 0 0 1-2 2" />
                  </svg>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-mute">
                    Uso interno · não vai pra proposta
                  </span>
                </div>
                <TextArea
                  value={selected.notes}
                  onChange={(v) => update(selected.id, { notes: v })}
                  rows={2}
                  placeholder="Anotações para o seu time — visível só aqui."
                />
              </div>

              <p className="pt-2 text-xs text-ink-mute">
                ✓ Alterações salvas automaticamente neste navegador.
              </p>
            </div>
            ) : (
              <PlansEditor
                key={selected.id}
                plans={selected.plans}
                onChange={(p) => update(selected.id, { plans: p })}
              />
            )}
          </div>
        ) : (
          <div className="grid h-full place-items-center text-center">
            <div>
              <div className="text-3xl">🗂️</div>
              <p className="mt-3 text-sm text-ink-soft">
                Cadastre suas soluções uma vez.
              </p>
              <p className="text-xs text-ink-mute">
                Elas serão reaproveitadas nas propostas.
              </p>
              <button
                onClick={handleAdd}
                className="mt-4 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-bg"
              >
                + Nova solução
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Preview ao vivo da seção (Soluções / Investimento) */}
      <SectionPreview
        block={previewBlock}
        payload={previewPayload}
        title={tab === "planos" ? "Preview · Investimento" : "Preview · Soluções"}
        subtitle={
          tab === "planos"
            ? "Como os planos aparecem na proposta."
            : "Como esta solução aparece na proposta."
        }
        empty={
          tab === "planos"
            ? "Adicione um plano para ver o preview."
            : "Selecione uma solução para ver o preview."
        }
      />
    </div>
  );
}

function EditorTabs({
  tab,
  onChange,
  planCount,
}: {
  tab: EditorTab;
  onChange: (t: EditorTab) => void;
  planCount: number;
}) {
  const tabs: { key: EditorTab; label: string; icon: string; badge?: number }[] =
    [
      { key: "detalhes", label: "Detalhes", icon: "📝" },
      { key: "planos", label: "Planos", icon: "💳", badge: planCount },
    ];
  return (
    <div className="mb-7 inline-flex gap-1 rounded-xl border border-line bg-panel p-1">
      {tabs.map((t) => {
        const active = t.key === tab;
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => onChange(t.key)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
              active
                ? "bg-accent/15 text-accent shadow-sm"
                : "text-ink-mute hover:text-ink-soft"
            }`}
          >
            <span className="text-base leading-none">{t.icon}</span>
            {t.label}
            {t.badge != null && (
              <span
                className={`grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[10px] font-semibold ${
                  active ? "bg-accent text-bg" : "bg-panel-2 text-ink-mute"
                }`}
              >
                {t.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function BillingToggle({
  value,
  onChange,
}: {
  value: Billing;
  onChange: (b: Billing) => void;
}) {
  const opts: { key: Billing; label: string }[] = [
    { key: "recorrente", label: "Recorrente" },
    { key: "pontual", label: "Pontual" },
  ];
  return (
    <div className="inline-flex rounded-lg border border-line p-0.5 text-xs">
      {opts.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => onChange(o.key)}
          className={`rounded-md px-2.5 py-1 transition ${
            value === o.key
              ? "bg-accent font-medium text-bg"
              : "text-ink-mute hover:text-ink-soft"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function PlansEditor({
  plans,
  onChange,
}: {
  plans: SolutionPlan[];
  onChange: (p: SolutionPlan[]) => void;
}) {
  const setPlan = (i: number, patch: Partial<SolutionPlan>) =>
    onChange(plans.map((p, j) => (j === i ? { ...p, ...patch } : p)));
  const setFeatured = (i: number) =>
    onChange(plans.map((p, j) => ({ ...p, featured: j === i })));
  const addPlan = () =>
    onChange([...plans, blankSolutionPlan(`Plano ${plans.length + 1}`)]);
  const removePlan = (i: number) =>
    onChange(plans.filter((_, j) => j !== i));

  return (
    <div>
      {/* Cabeçalho da seção — mesmo padrão de Consultores */}
      <div className="mb-6 flex items-start justify-between gap-4 border-b border-line pb-5">
        <div>
          <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">
            Planos desta solução
          </h2>
          <p className="mt-1.5 text-sm text-ink-mute">
            Cada plano pode ser recorrente (mensal) ou pontual (projeto único).
          </p>
        </div>
        <button
          onClick={addPlan}
          className="shrink-0 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-bg transition hover:opacity-90"
        >
          + Novo plano
        </button>
      </div>

      {/* Grade de cards (2 por linha) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {plans.map((p, i) => (
          <div
            key={p.id}
            className={`rounded-xl border bg-panel p-4 transition ${
              p.featured ? "border-accent/50" : "border-line"
            }`}
          >
            <div className="mb-3 flex items-center justify-between">
              <span
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                  p.featured
                    ? "bg-accent/15 text-accent"
                    : "bg-panel-2 text-ink-mute"
                }`}
              >
                {p.featured ? "★ Recomendado" : `Plano ${i + 1}`}
              </span>
              <MiniBtn danger onClick={() => removePlan(i)}>
                excluir
              </MiniBtn>
            </div>

            <div className="grid grid-cols-[1fr_110px] gap-2">
              <label className="block">
                <Label>Nome do plano</Label>
                <TextInput
                  value={p.name}
                  onChange={(v) => setPlan(i, { name: v })}
                  placeholder="Nome do plano"
                />
              </label>
              <label className="block">
                <Label>Preço</Label>
                <TextInput
                  value={p.price}
                  onChange={(v) => setPlan(i, { price: v })}
                  placeholder="R$ 0"
                />
              </label>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
              <BillingToggle
                value={p.billing}
                onChange={(b) => setPlan(i, { billing: b })}
              />
              <label className="flex shrink-0 items-center gap-1.5 text-xs text-ink-mute">
                <input
                  type="checkbox"
                  checked={p.featured}
                  onChange={() => setFeatured(i)}
                  className="accent-[var(--color-accent)]"
                />
                Recomendado
              </label>
            </div>

            <label className="mt-3 block">
              <Label>Descrição curta</Label>
              <TextInput
                value={p.description}
                onChange={(v) => setPlan(i, { description: v })}
                placeholder="Descrição curta do plano"
              />
            </label>

            <div className="mt-3">
              <Label>Itens do plano</Label>
              <ItemList
                value={p.features}
                onChange={(v) => setPlan(i, { features: v })}
                placeholder="Descreva um item incluso"
                addLabel="+ adicionar item"
              />
            </div>
          </div>
        ))}
      </div>

      {plans.length === 0 && (
        <div className="rounded-xl border border-dashed border-line p-8 text-center text-sm text-ink-mute">
          Nenhum plano. Clique em <strong>+ Novo plano</strong>.
        </div>
      )}
    </div>
  );
}
