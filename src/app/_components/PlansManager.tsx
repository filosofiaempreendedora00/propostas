"use client";

import { useEffect, useState } from "react";
import { useCatalog, usePlans } from "@/lib/catalog/store";
import { Label, TextInput, TextArea, LineList, MiniBtn } from "./fields";

export default function PlansManager() {
  const { items: solutions } = useCatalog();
  const { items, ready, add, update, remove } = usePlans();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (ready && selectedId === null && items.length > 0) {
      setSelectedId(items[0].id);
    }
    if (selectedId && !items.some((p) => p.id === selectedId)) {
      setSelectedId(items[0]?.id ?? null);
    }
  }, [ready, items, selectedId]);

  const selected = items.find((p) => p.id === selectedId) ?? null;

  const handleAdd = () => setSelectedId(add());

  const toggleSolution = (planId: string, solId: string, current: string[]) => {
    const next = current.includes(solId)
      ? current.filter((x) => x !== solId)
      : [...current, solId];
    update(planId, { solutionIds: next });
  };

  // "Recomendado" é exclusivo: marca um, desmarca os outros.
  const setFeatured = (planId: string, value: boolean) => {
    items.forEach((p) =>
      update(p.id, { featured: p.id === planId ? value : false }),
    );
  };

  return (
    <div className="grid h-full grid-cols-[300px_1fr]">
      {/* Lista */}
      <aside className="form-scroll overflow-y-auto border-r border-line">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-bg/95 px-4 py-3 backdrop-blur">
          <div>
            <div className="text-sm font-semibold">Planos</div>
            <div className="text-[11px] text-ink-mute">
              {items.length} cadastrado(s)
            </div>
          </div>
          <button
            onClick={handleAdd}
            className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-bg transition hover:opacity-90"
          >
            + Novo
          </button>
        </div>

        <ul className="p-2">
          {items.map((p) => {
            const active = p.id === selectedId;
            return (
              <li key={p.id}>
                <button
                  onClick={() => setSelectedId(p.id)}
                  className={`mb-1 flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition ${
                    active ? "bg-panel" : "hover:bg-panel/60"
                  }`}
                >
                  <span className="min-w-0">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium text-ink">
                        {p.name || "Sem nome"}
                      </span>
                      {p.featured && (
                        <span className="rounded-full border border-accent px-1.5 text-[9px] uppercase tracking-wide text-accent">
                          rec
                        </span>
                      )}
                    </span>
                    <span className="block truncate text-xs text-ink-mute">
                      {p.price}
                      {p.priceSuffix} · {p.solutionIds.length} solução(ões)
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
          {ready && items.length === 0 && (
            <li className="px-3 py-8 text-center text-xs text-ink-mute">
              Nenhum plano. Clique em <strong>+ Novo</strong>.
            </li>
          )}
        </ul>
      </aside>

      {/* Editor */}
      <section className="form-scroll overflow-y-auto">
        {selected ? (
          <div className="mx-auto max-w-3xl px-8 py-8">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <div className="text-[11px] uppercase tracking-[0.14em] text-ink-mute">
                  Editando plano
                </div>
                <div className="text-base font-semibold">
                  {selected.name || "Sem nome"}
                </div>
              </div>
              <MiniBtn danger onClick={() => remove(selected.id)}>
                excluir
              </MiniBtn>
            </div>

            <div className="space-y-5">
              <div className="grid grid-cols-[1fr_120px_90px] gap-3">
                <label>
                  <Label>Nome do plano</Label>
                  <TextInput
                    value={selected.name}
                    onChange={(v) => update(selected.id, { name: v })}
                    placeholder="Ex: Scale"
                  />
                </label>
                <label>
                  <Label>Preço</Label>
                  <TextInput
                    value={selected.price}
                    onChange={(v) => update(selected.id, { price: v })}
                    placeholder="R$ 4.997"
                  />
                </label>
                <label>
                  <Label>Sufixo</Label>
                  <TextInput
                    value={selected.priceSuffix}
                    onChange={(v) => update(selected.id, { priceSuffix: v })}
                    placeholder="/mês"
                  />
                </label>
              </div>

              <label className="block">
                <Label>Descrição curta</Label>
                <TextInput
                  value={selected.description}
                  onChange={(v) => update(selected.id, { description: v })}
                  placeholder="Subtítulo do plano"
                />
              </label>

              <label className="flex items-center gap-2.5 rounded-lg border border-line bg-panel px-3 py-2.5">
                <input
                  type="checkbox"
                  checked={selected.featured}
                  onChange={(e) => setFeatured(selected.id, e.target.checked)}
                  className="accent-[var(--color-accent)]"
                />
                <span className="text-sm">
                  Marcar como <strong>Recomendado</strong> (destaque)
                </span>
              </label>

              {/* Vínculo inteligente: soluções incluídas */}
              <div>
                <Label>Soluções incluídas neste plano</Label>
                {solutions.length === 0 ? (
                  <p className="text-xs text-ink-mute">
                    Cadastre soluções na aba “Soluções” primeiro.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {solutions.map((s) => {
                      const on = selected.solutionIds.includes(s.id);
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() =>
                            toggleSolution(
                              selected.id,
                              s.id,
                              selected.solutionIds,
                            )
                          }
                          className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                            on
                              ? "border-accent bg-accent/15 text-accent"
                              : "border-line text-ink-soft hover:border-ink-mute"
                          }`}
                        >
                          {on ? "✓ " : ""}
                          {s.icon} {s.name}
                        </button>
                      );
                    })}
                  </div>
                )}
                <p className="mt-1.5 text-[11px] text-ink-mute">
                  As soluções marcadas viram itens do plano na proposta,
                  automaticamente.
                </p>
              </div>

              <label className="block">
                <Label>Itens adicionais (um por linha)</Label>
                <LineList
                  value={selected.extraFeatures}
                  onChange={(v) => update(selected.id, { extraFeatures: v })}
                  rows={4}
                  placeholder={"Suporte prioritário\nReunião quinzenal"}
                />
              </label>

              <p className="pt-1 text-xs text-ink-mute">
                ✓ Alterações salvas automaticamente neste navegador.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid h-full place-items-center text-center">
            <div>
              <div className="text-3xl">💳</div>
              <p className="mt-3 text-sm text-ink-soft">
                Cadastre seus planos de investimento.
              </p>
              <button
                onClick={handleAdd}
                className="mt-4 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-bg"
              >
                + Novo plano
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
