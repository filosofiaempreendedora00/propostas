"use client";

import { useMemo, useState } from "react";
import { useTemplates } from "@/lib/templates/store";
import { BLOCKS, type BlockKey } from "@/lib/templates/types";
import type { BlockTemplate } from "@/lib/templates/types";
import { MiniBtn } from "./fields";
import TemplateEditor from "./TemplateEditor";

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`h-4 w-4 transition-transform ${open ? "rotate-90" : ""}`}
    >
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
    >
      <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
    </svg>
  );
}

function VariationCard({
  template,
  index,
  open,
  onToggle,
  update,
  onRemove,
}: {
  template: BlockTemplate;
  index: number;
  open: boolean;
  onToggle: () => void;
  update: (id: string, patch: Partial<BlockTemplate>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-panel">
      <div
        onClick={onToggle}
        className={`flex cursor-pointer select-none items-center gap-3 px-4 py-3 transition hover:bg-panel-2 ${
          open ? "bg-panel-2" : ""
        }`}
      >
        <span className="text-ink-mute">
          <Chevron open={open} />
        </span>
        <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md bg-accent/15 text-[11px] font-semibold text-accent">
          {index + 1}
        </span>
        <input
          value={template.name}
          onChange={(e) => update(template.id, { name: e.target.value })}
          onClick={(e) => e.stopPropagation()}
          placeholder="Nome da variação"
          className="min-w-0 flex-1 bg-transparent text-sm font-medium text-ink outline-none placeholder:text-ink-mute"
        />
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          title="Excluir variação"
          className="shrink-0 text-ink-mute transition hover:text-red-400"
        >
          <TrashIcon />
        </button>
      </div>
      {open && (
        <div className="border-t border-line px-4 pb-5 pt-4">
          <TemplateEditor template={template} update={update} />
        </div>
      )}
    </div>
  );
}

export default function TemplatesWorkspace() {
  const { items, ready, add, update, remove } = useTemplates();
  const [block, setBlock] = useState<BlockKey>("understanding");
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());

  const blockItems = useMemo(
    () => items.filter((t) => t.block === block),
    [items, block],
  );
  const activeMeta = BLOCKS.find((b) => b.key === block)!;

  const toggleOpen = (id: string) =>
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const handleAdd = () => {
    const id = add(block);
    setOpenIds((prev) => new Set(prev).add(id)); // já abre o card novo
  };

  return (
    <div className="grid h-full grid-cols-[260px_1fr]">
      {/* Menu de blocos */}
      <aside className="form-scroll overflow-y-auto border-r border-line p-2">
        <div className="px-2 pb-2 pt-2 text-[11px] font-medium uppercase tracking-[0.14em] text-ink-mute">
          Blocos
        </div>
        {BLOCKS.map((b) => {
          const active = b.key === block;
          const count = items.filter((t) => t.block === b.key).length;
          return (
            <button
              key={b.key}
              onClick={() => setBlock(b.key)}
              className={`mb-1 flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm transition ${
                active ? "bg-panel text-ink" : "text-ink-soft hover:bg-panel/60"
              }`}
            >
              <span
                className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border text-[10px] font-semibold ${
                  active ? "border-accent text-accent" : "border-line text-ink-mute"
                }`}
              >
                {b.n}
              </span>
              <span className="min-w-0 flex-1 truncate font-medium">
                {b.label}
              </span>
              <span className="shrink-0 text-[11px] text-ink-mute">{count}</span>
            </button>
          );
        })}
      </aside>

      {/* Variações do bloco (cards) */}
      <section className="form-scroll overflow-y-auto">
        <div className="mx-auto max-w-3xl px-8 py-8">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-[0.14em] text-ink-mute">
                Bloco {activeMeta.n}
              </div>
              <h2 className="text-xl font-semibold">{activeMeta.label}</h2>
              <p className="mt-1 text-xs text-ink-mute">
                Clique numa variação para abrir e editar.
              </p>
            </div>
            <MiniBtn onClick={handleAdd}>+ Nova variação</MiniBtn>
          </div>

          <div className="space-y-3">
            {blockItems.map((t, i) => (
              <VariationCard
                key={t.id}
                template={t}
                index={i}
                open={openIds.has(t.id)}
                onToggle={() => toggleOpen(t.id)}
                update={update}
                onRemove={() => remove(t.id)}
              />
            ))}
            {ready && blockItems.length === 0 && (
              <div className="rounded-xl border border-dashed border-line p-8 text-center text-sm text-ink-mute">
                Nenhuma variação ainda. Clique em{" "}
                <strong>+ Nova variação</strong>.
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
