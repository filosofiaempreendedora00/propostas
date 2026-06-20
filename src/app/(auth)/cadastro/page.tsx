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

function Eye({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      {open ? (
        <>
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
          <circle cx="12" cy="12" r="3" />
        </>
      ) : (
        <>
          <path d="M3 3l18 18" />
          <path d="M10.6 6.2A9.8 9.8 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.3 4.1M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7a9.8 9.8 0 0 0 3.4-.6" />
          <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
        </>
      )}
    </svg>
  );
}

function traduzErro(raw: string): string {
  const m = raw.toLowerCase();
  if (m.includes("user already registered") || m.includes("already been registered"))
    return "Este e-mail já tem uma conta. Faça login.";
  if (m.includes("password should be at least"))
    return "A senha precisa ter pelo menos 6 caracteres.";
  if (m.includes("unable to validate email") || m.includes("invalid format"))
    return "E-mail inválido. Confira o endereço digitado.";
  if (m.includes("for security purposes") || m.includes("rate limit") || m.includes("too many"))
    return "Muitas tentativas. Aguarde alguns segundos e tente de novo.";
  if (m.includes("network") || m.includes("failed to fetch"))
    return "Sem conexão com o servidor. Verifique sua internet.";
  return "Algo deu errado. Tente novamente.";
}

const fieldCls =
  "w-full rounded-xl border border-field-line bg-field px-4 py-3 text-[15px] text-field-ink outline-none transition placeholder:text-field-mute focus:border-accent focus:ring-2 focus:ring-accent/30";

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
        router.push("/inicio");
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
    <div className="relative grid min-h-screen place-items-center bg-[#f4eee3] px-5 py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(110,82,38,0.10),transparent_60%)]"
      />
      <div className="relative w-full max-w-md">
        {/* Box marrom */}
        <div className="overflow-hidden rounded-3xl border border-[#3d2c1f] bg-panel shadow-[0_30px_80px_-30px_rgba(40,28,16,0.55)]">
          <div className="px-8 pb-9 pt-8 sm:px-10">
            {/* Marca */}
            <div className="mb-7 flex items-center gap-2.5">
              <Image
                src="/kronos-symbol.png"
                alt="Kronos"
                width={30}
                height={30}
                priority
                unoptimized
                className="h-7 w-7 select-none"
              />
              <span className="font-display text-lg font-semibold tracking-wide text-ink">
                Kronos
              </span>
            </div>

            <h1 className="font-display text-[2rem] font-semibold leading-[1.1] tracking-tight text-ink">
              Crie sua conta
            </h1>
            <p className="mt-2 text-sm text-ink-mute">
              Comece agora — sem cartão de crédito.
            </p>

            <form onSubmit={submit} className="mt-7 space-y-3.5">
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

              <p className="pt-1 text-center text-[11px] leading-relaxed text-ink-mute">
                Ao criar a conta, você concorda com os Termos de Uso e a
                Política de Privacidade.
              </p>
            </form>
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-ink-soft">
          Já tem conta?{" "}
          <Link href="/login" className="font-semibold text-[#6e5226] hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
