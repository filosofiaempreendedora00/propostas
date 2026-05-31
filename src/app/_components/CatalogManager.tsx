"use client";

import { useEffect, useState } from "react";
import { useCatalog, blankSolutionPlan } from "@/lib/catalog/store";
import type { SolutionPlan, Billing } from "@/lib/catalog/types";
import { Label, TextInput, TextArea, LineList, ItemList, MiniBtn } from "./fields";

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

  return (
    <div className="grid h-full grid-cols-[300px_1fr]">
      {/* Lista */}
      <aside className="form-scroll overflow-y-auto border-r border-line">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-bg/95 px-4 py-3 backdrop-blur">
          <div>
            <div className="text-sm font-semibold">Soluções</div>
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
          <div className="mx-auto max-w-3xl px-8 py-8">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <input
                  value={selected.icon}
                  onChange={(e) =>
                    update(selected.id, { icon: e.target.value.slice(0, 2) })
                  }
                  className="h-11 w-11 rounded-lg border border-line bg-panel-2 text-center text-xl outline-none focus:border-accent/60"
                  aria-label="Ícone"
                />
                <div>
                  <div className="text-[11px] uppercase tracking-[0.14em] text-ink-mute">
                    Editando solução
                  </div>
                  <div className="text-base font-semibold">
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
                <label className="block">
                  <Label>Destaques (um por linha)</Label>
                  <LineList
                    value={selected.highlights}
                    onChange={(v) => update(selected.id, { highlights: v })}
                    rows={4}
                    placeholder={"Diferenciais\nItem por linha"}
                  />
                </label>
                <label className="block">
                  <Label>Precisamos do cliente (um por linha)</Label>
                  <LineList
                    value={selected.requirements}
                    onChange={(v) => update(selected.id, { requirements: v })}
                    rows={4}
                    placeholder={"Acessos, materiais\nItem por linha"}
                  />
                </label>
              </div>

              <label className="block">
                <Label>Observações internas (não vão pra proposta)</Label>
                <TextArea
                  value={selected.notes}
                  onChange={(v) => update(selected.id, { notes: v })}
                  rows={2}
                  placeholder="Anotações para o seu time."
                />
              </label>

              <p className="pt-2 text-xs text-ink-mute">
                ✓ Alterações salvas automaticamente neste navegador.
              </p>
            </div>
            ) : (
              <div>
                <p className="mb-4 text-xs text-ink-mute">
                  Cada plano pode ser recorrente (mensal) ou pontual (projeto
                  único). Clique num card para expandir e editar.
                </p>
                <PlansEditor
                  key={selected.id}
                  plans={selected.plans}
                  onChange={(p) => update(selected.id, { plans: p })}
                />
              </div>
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
  const tabs: { key: EditorTab; label: string; badge?: number }[] = [
    { key: "detalhes", label: "Detalhes" },
    { key: "planos", label: "Planos", badge: planCount },
  ];
  return (
    <div className="mb-6 flex gap-6 border-b border-line">
      {tabs.map((t) => {
        const active = t.key === tab;
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => onChange(t.key)}
            className={`-mb-px flex items-center gap-2 border-b-2 pb-2.5 text-sm font-medium transition ${
              active
                ? "border-accent text-ink"
                : "border-transparent text-ink-mute hover:text-ink-soft"
            }`}
          >
            {t.label}
            {t.badge != null && (
              <span
                className={`grid h-4 min-w-4 place-items-center rounded-full px-1 text-[10px] font-semibold ${
                  active ? "bg-accent text-bg" : "bg-panel text-ink-mute"
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
  // Começa tudo recolhido — cada card abre/fecha de forma independente.
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set());
  const toggleOpen = (id: string) =>
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const setPlan = (i: number, patch: Partial<SolutionPlan>) =>
    onChange(plans.map((p, j) => (j === i ? { ...p, ...patch } : p)));
  const setFeatured = (i: number) =>
    onChange(plans.map((p, j) => ({ ...p, featured: j === i })));

  const addPlan = () => {
    const plan = blankSolutionPlan(`Plano ${plans.length + 1}`);
    onChange([...plans, plan]);
    setOpenIds((prev) => new Set(prev).add(plan.id)); // novo já abre
  };

  return (
    <div className="space-y-3">
      {plans.map((p, i) => {
        const open = openIds.has(p.id);
        return (
          <div
            key={p.id}
            className={`overflow-hidden rounded-xl border bg-panel transition ${
              open ? "border-accent/40" : "border-line hover:border-line/80"
            }`}
          >
            {/* Cabeçalho recolhível: nome + cobrança + preço */}
            <button
              type="button"
              onClick={() => toggleOpen(p.id)}
              className="flex w-full items-center gap-3 px-3.5 py-3 text-left"
            >
              <svg
                viewBox="0 0 24 24"
                className={`h-4 w-4 shrink-0 text-ink-mute transition-transform ${
                  open ? "rotate-90" : ""
                }`}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium text-ink">
                    {p.name || "Sem nome"}
                  </span>
                  {p.featured && (
                    <span className="shrink-0 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
                      ★ Recomendado
                    </span>
                  )}
                </span>
                <span className="mt-0.5 block text-[11px] text-ink-mute">
                  {p.billing === "recorrente" ? "Recorrente (mensal)" : "Pontual (projeto único)"}
                </span>
              </span>
              <span className="shrink-0 text-sm font-semibold text-ink">
                {p.price || "—"}
              </span>
            </button>

            {/* Corpo expandido: edição completa */}
            {open && (
              <div className="space-y-3 border-t border-line px-3.5 py-3.5">
                <div className="grid grid-cols-[1fr_120px] gap-2">
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
                <div className="flex items-center justify-between gap-3">
                  <BillingToggle
                    value={p.billing}
                    onChange={(b) => setPlan(i, { billing: b })}
                  />
                  <label className="flex items-center gap-1.5 text-xs text-ink-mute">
                    <input
                      type="checkbox"
                      checked={p.featured}
                      onChange={() => setFeatured(i)}
                      className="accent-[var(--color-accent)]"
                    />
                    Recomendado
                  </label>
                </div>
                <label className="block">
                  <Label>Descrição curta</Label>
                  <TextInput
                    value={p.description}
                    onChange={(v) => setPlan(i, { description: v })}
                    placeholder="Descrição curta do plano"
                  />
                </label>
                <label className="block">
                  <Label>Itens (um por linha)</Label>
                  <LineList
                    value={p.features}
                    onChange={(v) => setPlan(i, { features: v })}
                    rows={3}
                  />
                </label>
                <div className="flex justify-end pt-1">
                  <MiniBtn
                    danger
                    onClick={() => onChange(plans.filter((_, j) => j !== i))}
                  >
                    remover plano
                  </MiniBtn>
                </div>
              </div>
            )}
          </div>
        );
      })}
      <MiniBtn onClick={addPlan}>+ adicionar plano</MiniBtn>
    </div>
  );
}
