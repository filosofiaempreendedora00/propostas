"use client";

import { useMemo, useState } from "react";
import { setSuggestionStatus, deleteSuggestion } from "@/lib/suggestions/actions";
import type {
  AdminSuggestion,
  SuggestionStatus,
} from "@/lib/suggestions/types";

const COLUMNS: { status: SuggestionStatus; label: string; dot: string }[] = [
  { status: "new", label: "Novas", dot: "bg-sky-400" },
  { status: "reviewing", label: "Em análise", dot: "bg-amber-400" },
  { status: "planned", label: "Planejadas", dot: "bg-accent" },
  { status: "done", label: "Concluídas", dot: "bg-emerald-400" },
  { status: "declined", label: "Recusadas", dot: "bg-red-400" },
];

const CATEGORY_META: Record<string, { emoji: string; label: string }> = {
  ideia: { emoji: "💡", label: "Ideia nova" },
  melhoria: { emoji: "✨", label: "Melhoria" },
  problema: { emoji: "🐞", label: "Problema / bug" },
  outro: { emoji: "💬", label: "Outro" },
};

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
    });
  } catch {
    return "—";
  }
}

export default function SuggestionsKanban({
  initial,
}: {
  initial: AdminSuggestion[];
}) {
  const [items, setItems] = useState<AdminSuggestion[]>(initial);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<SuggestionStatus | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const byColumn = useMemo(() => {
    const map: Record<string, AdminSuggestion[]> = {};
    for (const c of COLUMNS) map[c.status] = [];
    for (const s of items) (map[s.status] ?? (map[s.status] = [])).push(s);
    return map;
  }, [items]);

  const open = items.find((s) => s.id === openId) ?? null;

  const move = async (id: string, status: SuggestionStatus) => {
    const cur = items.find((s) => s.id === id);
    if (!cur || cur.status === status) return;
    const prev = items;
    setItems((list) => list.map((s) => (s.id === id ? { ...s, status } : s)));
    try {
      await setSuggestionStatus(id, status);
    } catch {
      setItems(prev); // reverte
      alert("Não foi possível mover. Tente de novo.");
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir esta sugestão? Não dá pra desfazer.")) return;
    const prev = items;
    setBusy(true);
    setItems((list) => list.filter((s) => s.id !== id));
    setOpenId(null);
    try {
      await deleteSuggestion(id);
    } catch {
      setItems(prev);
      alert("Não foi possível excluir.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map((col) => {
          const list = byColumn[col.status] ?? [];
          return (
            <div
              key={col.status}
              onDragOver={(e) => {
                e.preventDefault();
                setOverCol(col.status);
              }}
              onDragLeave={() => setOverCol((c) => (c === col.status ? null : c))}
              onDrop={(e) => {
                e.preventDefault();
                if (dragId) move(dragId, col.status);
                setDragId(null);
                setOverCol(null);
              }}
              className={`flex w-[280px] shrink-0 flex-col rounded-2xl border p-3 transition ${
                overCol === col.status
                  ? "border-accent/60 bg-accent/[0.06]"
                  : "border-line bg-panel-2/40"
              }`}
            >
              <div className="mb-3 flex items-center gap-2 px-1">
                <span className={`h-2 w-2 rounded-full ${col.dot}`} />
                <span className="text-sm font-semibold text-ink">
                  {col.label}
                </span>
                <span className="ml-auto rounded-full bg-panel px-2 py-0.5 text-[11px] font-semibold text-ink-mute">
                  {list.length}
                </span>
              </div>

              <div className="flex flex-col gap-2.5">
                {list.length === 0 && (
                  <div className="rounded-xl border border-dashed border-line/70 px-3 py-6 text-center text-[12px] text-ink-mute">
                    Vazio
                  </div>
                )}
                {list.map((s) => {
                  const cat = CATEGORY_META[s.category] ?? CATEGORY_META.outro;
                  return (
                    <article
                      key={s.id}
                      draggable
                      onDragStart={() => setDragId(s.id)}
                      onDragEnd={() => {
                        setDragId(null);
                        setOverCol(null);
                      }}
                      onClick={() => setOpenId(s.id)}
                      className={`cursor-pointer rounded-xl border border-line bg-panel p-3 transition hover:border-accent/50 ${
                        dragId === s.id ? "opacity-40" : ""
                      }`}
                    >
                      <div className="mb-1 flex items-center gap-1.5 text-[11px] text-ink-mute">
                        <span>{cat.emoji}</span>
                        <span>{cat.label}</span>
                        <span className="ml-auto">{fmtDate(s.createdAt)}</span>
                      </div>
                      <h3 className="text-sm font-medium leading-snug text-ink">
                        {s.title}
                      </h3>
                      {s.body && (
                        <p className="mt-1 line-clamp-2 text-[12px] text-ink-mute">
                          {s.body}
                        </p>
                      )}
                      <div className="mt-2 truncate text-[11px] text-ink-mute">
                        {s.authorEmail ?? "—"}
                        {s.orgName ? ` · ${s.orgName}` : ""}
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Detalhe / triagem manual */}
      {open && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4"
          onClick={() => setOpenId(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-line bg-panel p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-1 flex items-center gap-1.5 text-[12px] text-ink-mute">
              <span>{(CATEGORY_META[open.category] ?? CATEGORY_META.outro).emoji}</span>
              <span>
                {(CATEGORY_META[open.category] ?? CATEGORY_META.outro).label}
              </span>
              <span className="ml-auto">{fmtDate(open.createdAt)}</span>
            </div>
            <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">
              {open.title}
            </h2>
            <p className="mt-1 text-[12px] text-ink-mute">
              {open.authorEmail ?? "—"}
              {open.orgName ? ` · ${open.orgName}` : ""}
            </p>

            {open.body && (
              <p className="mt-4 max-h-64 overflow-y-auto whitespace-pre-wrap rounded-xl border border-line bg-panel-2/50 p-4 text-sm text-ink-soft">
                {open.body}
              </p>
            )}

            <div className="mt-5">
              <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-ink-mute">
                Mover para
              </p>
              <div className="flex flex-wrap gap-2">
                {COLUMNS.map((c) => (
                  <button
                    key={c.status}
                    onClick={() => move(open.id, c.status)}
                    className={`rounded-lg border px-3 py-1.5 text-[13px] font-medium transition ${
                      open.status === c.status
                        ? "border-accent bg-accent/15 text-accent"
                        : "border-line text-ink-soft hover:border-accent/50 hover:text-ink"
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between">
              <button
                onClick={() => remove(open.id)}
                disabled={busy}
                className="text-[13px] font-medium text-red-400 transition hover:text-red-300 disabled:opacity-50"
              >
                Excluir
              </button>
              <button
                onClick={() => setOpenId(null)}
                className="rounded-lg bg-accent px-4 py-2 text-[13px] font-semibold text-bg transition hover:opacity-90"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
