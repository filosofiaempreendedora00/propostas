"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  getTeam,
  inviteMember,
  removeMember,
  cancelInvite,
  type Team,
} from "@/lib/team/actions";

export default function TeamManager() {
  const [team, setTeam] = useState<Team | null>(null);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () =>
    getTeam()
      .then(setTeam)
      .catch(() => setError("Não consegui carregar a equipe."));
  useEffect(() => {
    void load();
  }, []);

  if (!team) {
    return <div className="p-10 text-sm text-ink-mute">Carregando…</div>;
  }

  const isOwner = team.myRole === "owner";
  const individual = team.seatLimit <= 1;
  const seatsLeft = team.seatLimit - team.used;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim()) return;
    setBusy(true);
    try {
      await inviteMember(email.trim());
      setEmail("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao convidar.");
    } finally {
      setBusy(false);
    }
  };

  const onRemove = async (userId: string) => {
    setBusy(true);
    setError(null);
    try {
      await removeMember(userId);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao remover.");
    } finally {
      setBusy(false);
    }
  };

  const onCancel = async (id: string) => {
    setBusy(true);
    setError(null);
    try {
      await cancelInvite(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="form-scroll h-full overflow-y-auto">
      <div className="mx-auto max-w-2xl px-10 py-9">
        <div className="mb-7 flex items-start justify-between gap-4 border-b border-line pb-5">
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">
              Equipe
            </h1>
            <p className="mt-1.5 text-sm text-ink-mute">
              {isOwner
                ? "Convide vendedores para usar o mesmo catálogo e templates."
                : "Você faz parte desta equipe e usa o catálogo compartilhado."}
            </p>
          </div>
          <span className="shrink-0 rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-ink-soft">
            {team.used} / {team.seatLimit} assentos
          </span>
        </div>

        {error && (
          <p className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            {error}
          </p>
        )}

        {individual ? (
          <div className="mb-7 rounded-xl border border-accent/40 bg-accent/10 p-5 text-sm leading-relaxed text-ink-soft">
            Seu plano é <strong className="text-ink">Individual</strong> (1
            assento). Para adicionar sua equipe (até 10 pessoas), faça upgrade
            para o{" "}
            <Link href="/planos" className="font-medium text-accent hover:underline">
              plano Time
            </Link>
            .
          </div>
        ) : !isOwner ? (
          <p className="mb-7 text-sm text-ink-mute">
            Só o dono da conta gerencia a equipe.
          </p>
        ) : (
          <form onSubmit={submit} className="mb-7 flex items-end gap-2">
            <label className="block flex-1">
              <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.12em] text-ink-mute">
                Convidar por e-mail
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vendedor@empresa.com"
                disabled={seatsLeft <= 0}
                className="w-full rounded-lg border border-field-line bg-field px-3 py-2 text-sm text-field-ink outline-none transition placeholder:text-field-mute focus:border-accent focus:ring-2 focus:ring-accent/30 disabled:opacity-50"
              />
            </label>
            <button
              type="submit"
              disabled={busy || seatsLeft <= 0 || !email.trim()}
              className="shrink-0 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-bg transition enabled:hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {seatsLeft <= 0 ? "Sem assentos" : "Convidar"}
            </button>
          </form>
        )}

        {/* Membros */}
        <div className="space-y-2">
          {team.members.map((m) => (
            <div
              key={m.userId}
              className="flex items-center justify-between gap-3 rounded-lg border border-line bg-panel px-4 py-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent/15 text-xs font-semibold text-accent">
                  {(m.email[0] || "?").toUpperCase()}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-ink">
                    {m.email}
                    {m.userId === team.myId && (
                      <span className="ml-1.5 text-xs text-ink-mute">(você)</span>
                    )}
                  </span>
                  <span className="block text-[11px] uppercase tracking-wide text-ink-mute">
                    {m.role === "owner" ? "Dono" : "Membro"}
                  </span>
                </span>
              </div>
              {isOwner && m.role !== "owner" && (
                <button
                  type="button"
                  onClick={() => onRemove(m.userId)}
                  disabled={busy}
                  className="shrink-0 text-xs text-ink-mute transition hover:text-red-400 disabled:opacity-40"
                >
                  remover
                </button>
              )}
            </div>
          ))}

          {/* Convites pendentes */}
          {team.invitations.map((inv) => (
            <div
              key={inv.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-line bg-panel/50 px-4 py-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line text-xs text-ink-mute">
                  ✉
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm text-ink-soft">
                    {inv.email}
                  </span>
                  <span className="block text-[11px] uppercase tracking-wide text-ink-mute">
                    Convite pendente
                  </span>
                </span>
              </div>
              {isOwner && (
                <button
                  type="button"
                  onClick={() => onCancel(inv.id)}
                  disabled={busy}
                  className="shrink-0 text-xs text-ink-mute transition hover:text-red-400 disabled:opacity-40"
                >
                  cancelar
                </button>
              )}
            </div>
          ))}
        </div>

        {!individual && isOwner && (
          <p className="mt-5 text-[11px] text-ink-mute">
            Convidados entram com o mesmo e-mail do convite e passam a ver o
            catálogo, templates e consultores da conta.
          </p>
        )}
      </div>
    </div>
  );
}
