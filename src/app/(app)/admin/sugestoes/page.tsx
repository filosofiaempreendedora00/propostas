import Link from "next/link";
import { redirect } from "next/navigation";
import { isCurrentUserAdmin } from "@/lib/admin/data";
import { listAllSuggestions } from "@/lib/suggestions/actions";
import SuggestionsKanban from "@/app/_components/SuggestionsKanban";

export const dynamic = "force-dynamic";

export default async function AdminSugestoesPage() {
  if (!(await isCurrentUserAdmin())) redirect("/inicio");

  const all = await listAllSuggestions();
  const novas = all.filter((s) => s.status === "new").length;

  return (
    <div className="form-scroll h-full overflow-y-auto">
      <div className="mx-auto max-w-[1200px] px-8 py-9">
        <div className="mb-8 border-b border-line pb-6">
          <Link
            href="/admin"
            className="text-[12px] font-medium text-ink-mute transition hover:text-accent"
          >
            ← Painel master
          </Link>
          <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">
            Triagem
          </p>
          <h1 className="mt-1.5 font-display text-4xl font-semibold tracking-tight text-ink">
            Sugestões dos clientes
          </h1>
          <p className="mt-2 text-sm text-ink-mute">
            Arraste os cartões entre as colunas para triar — ou clique para ler o
            texto completo e mover por ali.
            {novas > 0 && (
              <span className="ml-1 text-ink-soft">
                Há <strong className="text-accent">{novas}</strong> nova
                {novas > 1 ? "s" : ""} aguardando.
              </span>
            )}
          </p>
        </div>

        {all.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line p-12 text-center text-sm text-ink-mute">
            Nenhuma sugestão ainda. Quando seus clientes enviarem, elas aparecem
            aqui.
          </div>
        ) : (
          <SuggestionsKanban initial={all} />
        )}
      </div>
    </div>
  );
}
