"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { AuthShell, AuthFooter, Spinner, Eye, fieldCls } from "../(auth)/_parts";

export default function RedefinirSenhaPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("As senhas não conferem.");
      return;
    }
    setLoading(true);
    try {
      const supabase = createSupabaseBrowser();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      router.push("/inicio");
      router.refresh();
    } catch {
      setError("Não foi possível atualizar a senha. Abra o link do e-mail de novo.");
      setLoading(false);
    }
  };

  return (
    <AuthShell
      footer={<AuthFooter text="Lembrou a senha?" linkLabel="Entrar" href="/login" />}
    >
      <h1 className="font-display text-[2rem] font-semibold leading-[1.1] tracking-tight text-ink">
        Nova senha
      </h1>
      <p className="mt-2 text-sm text-ink-mute">
        Escolha uma senha nova para sua conta.
      </p>

      <form onSubmit={submit} className="mt-7 space-y-3.5">
        <div className="relative">
          <input
            type={showPw ? "text" : "password"}
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Nova senha"
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
        <input
          type={showPw ? "text" : "password"}
          required
          minLength={6}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Confirme a nova senha"
          autoComplete="new-password"
          className={fieldCls}
        />

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
          {loading ? "Salvando…" : "Salvar nova senha"}
        </button>
      </form>
    </AuthShell>
  );
}
