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

export default function CadastroPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (password.length < 6) {
      setError("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    setLoading(true);
    try {
      const supabase = createSupabaseBrowser();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { first_name: first.trim(), last_name: last.trim() } },
      });
      if (error) throw error;
      if (data.session) {
        // ?novo=1 sinaliza cadastro novo → dispara CompleteRegistration uma vez.
        router.push("/inicio?novo=1");
        router.refresh();
      } else {
        setInfo("Conta criada! Verifique seu e-mail para confirmar e depois entre.");
      }
    } catch (err) {
      setError(traduzErro(err instanceof Error ? err.message : ""));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      footer={<AuthFooter text="Já tem conta?" linkLabel="Entrar" href="/login" />}
    >
      <h1 className="font-display text-[2rem] font-semibold leading-[1.1] tracking-tight text-ink">
        Crie sua conta
      </h1>
      <p className="mt-2 text-sm text-ink-mute">
        Comece agora — sem cartão de crédito.
      </p>

      <div className="mt-7">
        <GoogleButton label="Cadastrar com o Google" onError={setError} />
      </div>
      <OrDivider />

      <form onSubmit={submit} className="space-y-3.5">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Seu melhor e-mail"
          autoComplete="email"
          className={fieldCls}
        />
        <div className="grid grid-cols-2 gap-3">
          <input
            type="text"
            required
            value={first}
            onChange={(e) => setFirst(e.target.value)}
            placeholder="Nome"
            autoComplete="given-name"
            className={fieldCls}
          />
          <input
            type="text"
            value={last}
            onChange={(e) => setLast(e.target.value)}
            placeholder="Sobrenome"
            autoComplete="family-name"
            className={fieldCls}
          />
        </div>
        <div className="relative">
          <input
            type={showPw ? "text" : "password"}
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Crie uma senha"
            autoComplete="new-password"
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
          {loading ? "Criando conta…" : "Criar conta"}
        </button>
      </form>
    </AuthShell>
  );
}
