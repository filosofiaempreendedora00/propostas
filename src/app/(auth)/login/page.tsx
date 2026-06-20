"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import {
  AuthShell,
  AuthFooter,
  GoogleButton,
  OrDivider,
  Spinner,
  Eye,
  fieldCls,
  traduzErro,
} from "../_parts";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
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

  const forgot = async () => {
    setError(null);
    setInfo(null);
    if (!email.trim()) {
      setError("Digite seu e-mail acima para receber o link de redefinição.");
      return;
    }
    try {
      const supabase = createSupabaseBrowser();
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/callback?next=/redefinir-senha`,
      });
      if (error) throw error;
      setInfo("Enviamos um link de redefinição para o seu e-mail.");
    } catch {
      setError("Não foi possível enviar o link agora. Tente novamente em instantes.");
    }
  };

  return (
    <AuthShell
      footer={<AuthFooter text="Não tem conta?" linkLabel="Criar conta" href="/cadastro" />}
    >
      <h1 className="font-display text-[2rem] font-semibold leading-[1.1] tracking-tight text-ink">
        Entrar
      </h1>
      <p className="mt-2 text-sm text-ink-mute">
        Acesse seu gerador de propostas.
      </p>

      <div className="mt-7">
        <GoogleButton label="Entrar com o Google" onError={setError} />
      </div>
      <OrDivider />

      <form onSubmit={submit} className="space-y-3.5">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Seu e-mail"
          autoComplete="email"
          className={fieldCls}
        />
        <div className="relative">
          <input
            type={showPw ? "text" : "password"}
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Sua senha"
            autoComplete="current-password"
            className={`${fieldCls} pr-12`}
          />
          <button
            type="button"
            onClick={() => setShowPw((s) => !s)}
            aria-label={showPw ? "Ocultar senha" : "Mostrar senha"}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-field-mute transition hover:text-field-ink"
          >
            <Eye open={showPw} />
          </button>
        </div>

        <div className="flex items-center justify-between pt-0.5 text-[13px]">
          <label className="flex cursor-pointer select-none items-center gap-2 text-ink-soft">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 rounded border-line bg-field accent-accent"
            />
            Lembrar de mim
          </label>
          <button
            type="button"
            onClick={forgot}
            className="font-medium text-ink-soft transition hover:text-ink hover:underline"
          >
            Esqueceu a senha?
          </button>
        </div>

        {error && (
          <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-[13px] text-red-300">
            {error}
          </p>
        )}
        {info && (
          <p className="rounded-xl border border-accent/30 bg-accent/10 px-3.5 py-2.5 text-[13px] text-ink-soft">
            {info}
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
    </AuthShell>
  );
}
