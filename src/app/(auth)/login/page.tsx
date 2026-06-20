"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createSupabaseBrowser } from "@/lib/supabase/client";

function Spinner() {
  return (
    <svg className="h-[18px] w-[18px] animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" className="opacity-25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

// Traduz as mensagens de erro do Supabase (que vêm em inglês) para PT-BR.
function traduzErro(raw: string): string {
  const m = raw.toLowerCase();
  if (m.includes("invalid login credentials"))
    return "E-mail ou senha incorretos.";
  if (m.includes("email not confirmed"))
    return "Confirme seu e-mail antes de entrar (verifique sua caixa de entrada).";
  if (m.includes("for security purposes") || m.includes("rate limit") || m.includes("too many"))
    return "Muitas tentativas. Aguarde alguns segundos e tente de novo.";
  if (m.includes("network") || m.includes("failed to fetch"))
    return "Sem conexão com o servidor. Verifique sua internet.";
  return "Algo deu errado. Tente novamente.";
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createSupabaseBrowser();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      router.push("/inicio");
      router.refresh();
    } catch (err) {
      setError(traduzErro(err instanceof Error ? err.message : ""));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative grid min-h-screen place-items-center px-5 py-10 text-ink">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(168,144,112,0.10),transparent_70%)]"
      />
      <div className="relative w-full max-w-md">
        <div className="mb-9 flex flex-col items-center text-center">
          <Image
            src="/kronos-symbol.png"
            alt="Kronos"
            width={64}
            height={64}
            priority
            unoptimized
            className="h-16 w-16 select-none"
          />
          <h1 className="mt-6 font-display text-[2.6rem] font-semibold leading-[1.05] tracking-tight">
            Entrar na Kronos
          </h1>
          <p className="mt-2.5 text-[15px] text-ink-mute">
            Acesse seu gerador de propostas.
          </p>
        </div>

        <div className="rounded-2xl border border-line/80 bg-panel/55 p-7 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.7)] backdrop-blur-md sm:p-9">
          <form onSubmit={submit} className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-xs font-medium uppercase tracking-[0.12em] text-ink-mute">
                E-mail
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@empresa.com"
                autoComplete="email"
                className="w-full rounded-xl border border-line bg-panel-2/80 px-4 py-3 text-[15px] text-ink outline-none transition focus:border-accent/60 focus:ring-2 focus:ring-accent/25"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-medium uppercase tracking-[0.12em] text-ink-mute">
                Senha
              </span>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                className="w-full rounded-xl border border-line bg-panel-2/80 px-4 py-3 text-[15px] text-ink outline-none transition focus:border-accent/60 focus:ring-2 focus:ring-accent/25"
              />
            </label>

            {error && (
              <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-[13px] text-red-300">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3.5 text-[15px] font-semibold text-bg transition enabled:hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading && <Spinner />}
              {loading ? "Entrando…" : "Entrar"}
            </button>
          </form>
        </div>

        <p className="mt-7 text-center text-sm text-ink-mute">
          Ainda não tem conta?{" "}
          <Link href="/cadastro" className="font-medium text-accent hover:underline">
            Criar conta
          </Link>
        </p>
      </div>
    </div>
  );
}
