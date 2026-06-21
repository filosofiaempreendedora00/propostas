"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSuggestion } from "@/lib/suggestions/actions";

const CATEGORIES = [
  { value: "ideia", label: "💡 Ideia nova" },
  { value: "melhoria", label: "✨ Melhoria" },
  { value: "problema", label: "🐞 Problema / bug" },
  { value: "outro", label: "💬 Outro" },
];

const fieldCls =
  "w-full rounded-xl border border-field-line bg-field px-4 py-3 text-[15px] text-field-ink outline-none transition placeholder:text-field-mute focus:border-accent focus:ring-2 focus:ring-accent/30";

function Spinner() {
  return (
    <svg className="h-[18px] w-[18px] animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" className="opacity-25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export default function SuggestionForm() {
  const router = useRouter();
  const [category, setCategory] = useState("melhoria");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setDone(false);
    if (title.trim().length < 3) {
      setError("Dê um título com pelo menos 3 caracteres.");
      return;
    }
    setLoading(true);
    try {
      await createSuggestion({ title, body, category });
      setTitle("");
      setBody("");
      setCategory("melhoria");
      setDone(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível enviar. Tente de novo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="rounded-2xl border border-line bg-panel p-6">
      <div className="space-y-3.5">
        <div className="grid gap-3 sm:grid-cols-[200px_1fr]">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={fieldCls}
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={title}
            maxLength={140}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Resumo da sua ideia (ex.: poder duplicar uma proposta)"
            className={fieldCls}
          />
        </div>
        <textarea
          value={body}
          maxLength={4000}
          rows={4}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Conte com mais detalhes: o que você gostaria, e por quê. Quanto mais claro, melhor pra gente priorizar."
          className={`${fieldCls} resize-y`}
        />

        {error && (
          <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-[13px] text-red-300">
            {error}
          </p>
        )}
        {done && (
          <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2.5 text-[13px] text-emerald-700">
            Recebido! Obrigado — toda sugestão é lida pela nossa equipe. 🙌
          </p>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3 text-[15px] font-semibold text-bg transition enabled:hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading && <Spinner />}
            {loading ? "Enviando…" : "Enviar sugestão"}
          </button>
        </div>
      </div>
    </form>
  );
}
