import SuggestionForm from "@/app/_components/SuggestionForm";
import { listMySuggestions } from "@/lib/suggestions/actions";
import type { MySuggestion } from "@/lib/suggestions/types";

export const dynamic = "force-dynamic";

// Status mostrado ao CLIENTE — rótulos amigáveis (sem "recusada" cru).
const CLIENT_STATUS: Record<string, { label: string; cls: string }> = {
  new: { label: "Recebida", cls: "border-line bg-panel-2 text-ink-soft" },
  reviewing: {
    label: "Em análise",
    cls: "border-amber-500/30 bg-amber-500/10 text-amber-700",
  },
  planned: {
    label: "Planejada",
    cls: "border-accent/40 bg-accent/10 text-accent",
  },
  done: {
    label: "Concluída",
    cls: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700",
  },
  declined: {
    label: "Não priorizada",
    cls: "border-line bg-panel-2 text-ink-mute",
  },
};

const CATEGORY_LABEL: Record<string, string> = {
  ideia: "Ideia nova",
  melhoria: "Melhoria",
  problema: "Problema / bug",
  outro: "Outro",
};

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

export default async function SugestoesPage() {
  const mine = await listMySuggestions();

  return (
    <div className="cream form-scroll h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl px-10 py-12">
        <div className="mb-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">
            Sua voz importa
          </p>
          <h1 className="mt-1.5 font-display text-4xl font-semibold tracking-tight text-ink">
            Sugestões
          </h1>
          <p className="mt-2 text-sm text-ink-soft">
            Tem uma ideia pra deixar a ferramenta melhor? Conta pra gente. Lemos
            tudo — as melhores viram realidade.
          </p>
        </div>

        <SuggestionForm />

        {/* Minhas sugestões */}
        <section className="mt-10">
          <h2 className="mb-4 font-display text-2xl font-semibold tracking-tight text-ink">
            Minhas sugestões{mine.length > 0 && ` (${mine.length})`}
          </h2>

          {mine.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line p-8 text-center text-sm text-ink-mute">
              Você ainda não enviou nenhuma sugestão. Que tal a primeira? 👆
            </div>
          ) : (
            <div className="space-y-3">
              {mine.map((s: MySuggestion) => {
                const st = CLIENT_STATUS[s.status] ?? CLIENT_STATUS.new;
                return (
                  <div
                    key={s.id}
                    className="rounded-2xl border border-line bg-panel p-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-[11px] font-medium uppercase tracking-wide text-ink-mute">
                          {CATEGORY_LABEL[s.category] ?? s.category} ·{" "}
                          {fmtDate(s.createdAt)}
                        </div>
                        <h3 className="mt-1 font-medium text-ink">{s.title}</h3>
                      </div>
                      <span
                        className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${st.cls}`}
                      >
                        {st.label}
                      </span>
                    </div>
                    {s.body && (
                      <p className="mt-2 whitespace-pre-wrap text-sm text-ink-soft">
                        {s.body}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
