"use client";

import { useEffect, useMemo, useState } from "react";
import { useTemplates } from "@/lib/templates/store";
import { BLOCKS, type BlockKey } from "@/lib/templates/types";
import TemplateEditor from "./TemplateEditor";

export default function TemplatesWorkspace() {
  const { items, ready, add, update, remove } = useTemplates();
  const [block, setBlock] = useState<BlockKey>("understanding");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const blockItems = useMemo(
    () => items.filter((t) => t.block === block),
    [items, block],
  );

  useEffect(() => {
    if (!ready) return;
    if (selectedId && blockItems.some((t) => t.id === selectedId)) return;
    setSelectedId(blockItems[0]?.id ?? null);
  }, [ready, blockItems, selectedId]);

  const selected = blockItems.find((t) => t.id === selectedId) ?? null;
  const activeMeta = BLOCKS.find((b) => b.key === block)!;

  const handleAdd = () => setSelectedId(add(block));

  return (
    <div className="flex h-full flex-col">
      {/* Abas por bloco */}
      <div className="flex flex-wrap items-center gap-1 border-b border-line px-4 py-2.5">
        {BLOCKS.map((b) => (
          <button
            key={b.key}
            onClick={() => setBlock(b.key)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              block === b.key
                ? "bg-panel text-ink"
                : "text-ink-mute hover:text-ink-soft"
            }`}
          >
            <span className="grid h-4 w-4 place-items-center rounded-full border border-current text-[9px]">
              {b.n}
            </span>
            {b.label}
          </button>
        ))}
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[280px_1fr]">
        {/* Lista de variações do bloco */}
        <aside className="form-scroll overflow-y-auto border-r border-line">
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-bg/95 px-4 py-3 backdrop-blur">
            <div>
              <div className="text-sm font-semibold">Variações</div>
              <div className="text-[11px] text-ink-mute">
                {blockItems.length} de “{activeMeta.label}”
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
            {blockItems.map((t) => (
              <li key={t.id}>
                <button
                  onClick={() => setSelectedId(t.id)}
                  className={`mb-1 block w-full truncate rounded-lg px-3 py-2.5 text-left text-sm transition ${
                    t.id === selectedId
                      ? "bg-panel font-medium text-ink"
                      : "text-ink-soft hover:bg-panel/60"
                  }`}
                >
                  {t.name || "Sem nome"}
                </button>
              </li>
            ))}
            {ready && blockItems.length === 0 && (
              <li className="px-3 py-8 text-center text-xs text-ink-mute">
                Nenhuma variação. Clique em <strong>+ Nova</strong>.
              </li>
            )}
          </ul>
        </aside>

        {/* Editor */}
        <section className="form-scroll overflow-y-auto">
          {selected ? (
            <TemplateEditor
              key={selected.id}
              template={selected}
              update={update}
              onRemove={() => remove(selected.id)}
            />
          ) : (
            <div className="grid h-full place-items-center text-center">
              <div>
                <div className="text-3xl">🗂️</div>
                <p className="mt-3 text-sm text-ink-soft">
                  Crie variações de “{activeMeta.label}”.
                </p>
                <button
                  onClick={handleAdd}
                  className="mt-4 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-bg"
                >
                  + Nova variação
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
