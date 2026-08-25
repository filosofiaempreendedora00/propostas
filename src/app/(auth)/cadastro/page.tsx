"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { trackFunnel } from "@/lib/analytics/google";
import {
  AuthShell,
  AuthFooter,
  AuthLoadingOverlay,
  GoogleButton,
  OrDivider,
  Spinner,
  Eye,
  fieldCls,
  traduzErro,
} from "../_parts";

// Máscara leve de telefone BR: "(11) 99999-8888" (guardamos só os dígitos).
function formatPhone(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export default function CadastroPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Topo do funil que controlamos (a landing de marketing é externa): quem chega
  // na tela de cadastro. Com o device derivado no servidor, é aqui que se vê o
  // tráfego mobile do Meta antes de tocar a IA.
  useEffect(() => {
    trackFunnel("landing_view", { page: "cadastro" });
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    const phoneDigits = phone.replace(/\D/g, "");
    if (phoneDigits.length < 10) {
      setError("Informe seu WhatsApp com DDD (ex: (11) 99999-8888).");
      return;
    }
    if (password.length < 6) {
      setError("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    trackFunnel("signup_submitted", { method: "email" });
    setLoading(true);
    try {
      const supabase = createSupabaseBrowser();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: first.trim(),
            last_name: last.trim(),
            whatsapp: phoneDigits,
          },
        },
      });
      if (error) throw error;
      if (data.session) {
        // ?novo=1 sinaliza cadastro novo → dispara CompleteRegistration uma vez.
        // MANTÉM o loading (overlay) até a tela trocar — não reseta, senão o
        // feedback some no meio dos 3-6s de navegação e parece travado.
        router.push("/inicio?novo=1");
        router.refresh();
        return;
      }
      // Precisa confirmar e-mail (sem sessão): reseta e mostra o aviso.
      setInfo("Conta criada! Verifique seu e-mail para confirmar e depois entre.");
      setLoading(false);
    } catch (err) {
      setError(traduzErro(err instanceof Error ? err.message : ""));
      setLoading(false);
    }
  };

  return (
    <AuthShell
      footer={<AuthFooter text="Já tem conta?" linkLabel="Entrar" href="/login" />}
    >
      {loading && <AuthLoadingOverlay label="Criando sua conta…" />}
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
        {/* WhatsApp: campo obrigatório e com máscara — atrito mínimo. */}
        <div className="relative">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#25D366]">
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="h-5 w-5">
              <path d="M17.5 14.4c-.3-.2-1.7-.9-2-1-.3-.1-.5-.1-.6.2-.2.3-.7.9-.8 1-.2.2-.3.2-.6.1-1.7-.9-2.9-1.6-4-3.5-.3-.5.3-.5.8-1.5.1-.2 0-.3 0-.5s-.6-1.6-.9-2.2c-.2-.5-.4-.4-.6-.5h-.5c-.2 0-.5.1-.7.3-1 .9-1.2 2-1.1 3.3.4 2 1.5 3.4 3.2 4.8 2.4 2 3.9 2.2 4.8 2.2.6 0 1.9-.5 2.2-1.2.3-.7.3-1.3.2-1.4-.1-.2-.3-.2-.6-.4Z" />
              <path d="M12 2a10 10 0 0 0-8.5 15.2L2 22l4.9-1.5A10 10 0 1 0 12 2Zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-2.9.9.9-2.8-.2-.3A8.2 8.2 0 1 1 12 20.2Z" />
            </svg>
          </span>
          <input
            type="tel"
            required
            inputMode="numeric"
            value={phone}
            onChange={(e) => setPhone(formatPhone(e.target.value))}
            placeholder="Seu WhatsApp com DDD"
            autoComplete="tel-national"
            className={`${fieldCls} pl-11`}
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
            // "off" evita o Chrome gerar/pré-preencher uma "senha forte" que
            // gruda no campo e fica difícil de apagar — o usuário digita a sua.
            autoComplete="off"
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

        {/* Consentimento por ação: ao criar a conta, aceita os termos e autoriza
            o contato via WhatsApp. Links pequenos e clicáveis (respaldo LGPD). */}
        <p className="pt-0.5 text-center text-[11.5px] leading-relaxed text-ink-mute">
          Ao criar sua conta, você concorda com os{" "}
          <Link
            href="/termos"
            target="_blank"
            className="font-medium text-ink-soft underline underline-offset-2 transition hover:text-ink"
          >
            Termos de Uso
          </Link>{" "}
          e a{" "}
          <Link
            href="/politica-de-privacidade"
            target="_blank"
            className="font-medium text-ink-soft underline underline-offset-2 transition hover:text-ink"
          >
            Política de Privacidade
          </Link>
          , e autoriza o contato pelo WhatsApp informado.
        </p>
      </form>
    </AuthShell>
  );
}
