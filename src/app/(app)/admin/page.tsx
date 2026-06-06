import { redirect } from "next/navigation";
import {
  isCurrentUserAdmin,
  getAdminOverview,
  type AdminOrg,
  type AdminEvent,
} from "@/lib/admin/data";

export const dynamic = "force-dynamic";

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    active: {
      label: "Ativo",
      cls: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    },
    canceled: {
      label: "Cancelado",
      cls: "border-red-500/30 bg-red-500/10 text-red-300",
    },
    inactive: {
      label: "Sem assinatura",
      cls: "border-line bg-panel-2 text-ink-mute",
    },
    past_due: {
      label: "Atrasado",
      cls: "border-amber-500/30 bg-amber-500/10 text-amber-300",
    },
  };
  const s = map[status] ?? {
    label: status,
    cls: "border-line bg-panel-2 text-ink-mute",
  };
  return (
    <span
      className={`inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${s.cls}`}
    >
      {s.label}
    </span>
  );
}

function PlanBadge({ plan }: { plan: string }) {
  const time = plan === "time";
  return (
    <span
      className={`inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${
        time
          ? "border-accent/40 bg-accent/10 text-accent"
          : "border-line bg-panel-2 text-ink-soft"
      }`}
    >
      {time ? "Time" : "Individual"}
    </span>
  );
}

function StatCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: number | string;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 ${
        accent ? "border-accent/40 bg-accent/[0.06]" : "border-line bg-panel"
      }`}
    >
      <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-ink-mute">
        {label}
      </p>
      <p className="mt-2 font-display text-4xl font-semibold leading-none text-ink">
        {value}
      </p>
      {hint && <p className="mt-1.5 text-xs text-ink-mute">{hint}</p>}
    </div>
  );
}

export default async function AdminPage() {
  if (!(await isCurrentUserAdmin())) redirect("/inicio");

  const { totals, orgs, events } = await getAdminOverview();

  return (
    <div className="form-scroll h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl px-8 py-9">
        <div className="mb-8 border-b border-line pb-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">
            Painel master
          </p>
          <h1 className="mt-1.5 font-display text-4xl font-semibold tracking-tight text-ink">
            Visão geral
          </h1>
          <p className="mt-2 text-sm text-ink-mute">
            Acompanhe contas, assinaturas e equipes. Somente leitura — você não
            altera nada daqui.
          </p>
        </div>

        {/* Métricas */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard
            label="Assinantes ativos"
            value={totals.active}
            hint="Pagando agora"
            accent
          />
          <StatCard
            label="Contas criadas"
            value={totals.users}
            hint="Usuários no app"
          />
          <StatCard
            label="Cancelados"
            value={totals.canceled}
            hint="Reembolso/cancelamento"
          />
          <StatCard
            label="Sem assinatura"
            value={totals.inactive}
            hint="Criaram conta, não pagaram"
          />
        </div>

        <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Plano Individual" value={totals.individual} />
          <StatCard label="Plano Time" value={totals.time} />
          <StatCard label="Total de contas-empresa" value={totals.orgs} />
        </div>

        {/* Organizações */}
        <section className="mt-10">
          <h2 className="mb-3 font-display text-2xl font-semibold tracking-tight text-ink">
            Contas ({orgs.length})
          </h2>
          <div className="overflow-hidden rounded-2xl border border-line">
            <table className="w-full text-left text-sm">
              <thead className="bg-panel-2 text-[11px] uppercase tracking-wide text-ink-mute">
                <tr>
                  <th className="px-4 py-3 font-medium">Empresa / Dono</th>
                  <th className="px-4 py-3 font-medium">Plano</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Equipe</th>
                  <th className="px-4 py-3 font-medium">Criada em</th>
                </tr>
              </thead>
              <tbody>
                {orgs.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-ink-mute"
                    >
                      Nenhuma conta ainda.
                    </td>
                  </tr>
                )}
                {orgs.map((o: AdminOrg) => (
                  <tr
                    key={o.id}
                    className="border-t border-line bg-panel/40 align-top"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-ink">{o.name}</div>
                      <div className="text-xs text-ink-mute">
                        {o.ownerEmail ?? "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <PlanBadge plan={o.plan} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={o.status} />
                    </td>
                    <td className="px-4 py-3 text-ink-soft">
                      {o.members} / {o.seatLimit}
                      {o.pending > 0 && (
                        <span className="ml-1 text-xs text-ink-mute">
                          (+{o.pending} pendente{o.pending > 1 ? "s" : ""})
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-ink-mute">
                      {fmtDate(o.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Eventos de assinatura */}
        <section className="mt-10">
          <h2 className="mb-1 font-display text-2xl font-semibold tracking-tight text-ink">
            Eventos de assinatura
          </h2>
          <p className="mb-3 text-sm text-ink-mute">
            Últimas movimentações vindas da Kiwify (compra, renovação,
            cancelamento).
          </p>
          <div className="overflow-hidden rounded-2xl border border-line">
            <table className="w-full text-left text-sm">
              <thead className="bg-panel-2 text-[11px] uppercase tracking-wide text-ink-mute">
                <tr>
                  <th className="px-4 py-3 font-medium">E-mail da compra</th>
                  <th className="px-4 py-3 font-medium">Plano</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Quando</th>
                </tr>
              </thead>
              <tbody>
                {events.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-8 text-center text-ink-mute"
                    >
                      Nenhum evento ainda.
                    </td>
                  </tr>
                )}
                {events.map((e: AdminEvent, i: number) => (
                  <tr
                    key={`${e.email}-${i}`}
                    className="border-t border-line bg-panel/40"
                  >
                    <td className="px-4 py-3 text-ink">{e.email}</td>
                    <td className="px-4 py-3">
                      <PlanBadge plan={e.plan} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={e.status} />
                    </td>
                    <td className="px-4 py-3 text-xs text-ink-mute">
                      {fmtDate(e.updatedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
