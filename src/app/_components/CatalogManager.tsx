"use client";

import { useEffect, useState } from "react";
import { useCatalog, blankSolutionPlan } from "@/lib/catalog/store";
import type { SolutionPlan, Billing } from "@/lib/catalog/types";
import { Label, TextInput, TextArea, LineList, MiniBtn } from "./fields";

export default function CatalogManager() {
  const { items, ready, add, update, remove } = useCatalog();
  const [selectedId, setSelectedId] = useState<string | null>(null);

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

              <label className="block">
                <Label>Entregáveis (um por linha)</Label>
                <LineList
                  value={selected.deliverables}
                  onChange={(v) => update(selected.id, { deliverables: v })}
                  rows={4}
                  placeholder={"Entregáveis concretos\nItem por linha"}
                />
              </label>

              <label className="block">
                <Label>Prazo de execução</Label>
                <TextInput
                  value={selected.timeline}
                  onChange={(v) => update(selected.id, { timeline: v })}
                  placeholder="Ex: 30 dias úteis"
                />
              </label>

              <div className="rounded-xl border border-line bg-bg-soft/40 p-4">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-sm font-semibold text-accent">
                    Planos desta solução
                  </span>
                  <span className="text-[11px] text-ink-mute">
                    {selected.plans.length} plano(s)
                  </span>
                </div>
                <p className="mb-3 text-xs text-ink-mute">
                  Cada plano pode ser recorrente (mensal) ou pontual (projeto
                  único).
                </p>
                <PlansEditor
                  plans={selected.plans}
                  onChange={(p) => update(selected.id, { plans: p })}
                />
              </div>

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

  return (
    <div className="space-y-3">
      {plans.map((p, i) => (
        <div key={p.id} className="rounded-lg border border-line bg-panel p-3">
          <div className="mb-2 flex items-center justify-between">
            <label className="flex items-center gap-1.5 text-xs text-ink-mute">
              <input
                type="checkbox"
                checked={p.featured}
                onChange={() => setFeatured(i)}
                className="accent-[var(--color-accent)]"
              />
              Recomendado
            </label>
            <MiniBtn danger onClick={() => onChange(plans.filter((_, j) => j !== i))}>
              remover
            </MiniBtn>
          </div>
          <div className="grid grid-cols-[1fr_120px] gap-2">
            <TextInput
              value={p.name}
              onChange={(v) => setPlan(i, { name: v })}
              placeholder="Nome do plano"
            />
            <TextInput
              value={p.price}
              onChange={(v) => setPlan(i, { price: v })}
              placeholder="R$ 0"
            />
          </div>
          <div className="mt-2">
            <BillingToggle
              value={p.billing}
              onChange={(b) => setPlan(i, { billing: b })}
            />
          </div>
          <div className="mt-2">
            <TextInput
              value={p.description}
              onChange={(v) => setPlan(i, { description: v })}
              placeholder="Descrição curta do plano"
            />
          </div>
          <div className="mt-2">
            <Label>Itens (um por linha)</Label>
            <LineList
              value={p.features}
              onChange={(v) => setPlan(i, { features: v })}
              rows={3}
            />
          </div>
        </div>
      ))}
      <MiniBtn onClick={() => onChange([...plans, blankSolutionPlan(`Plano ${plans.length + 1}`)])}>
        + adicionar plano
      </MiniBtn>
    </div>
  );
}
