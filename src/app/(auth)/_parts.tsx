"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { createSupabaseBrowser } from "@/lib/supabase/client";

/* ───────────────────────── Ícones ───────────────────────── */

export function Spinner() {
  return (
    <svg className="h-[18px] w-[18px] animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" className="opacity-25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function Eye({ open }: { open: boolean }) {
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

function GoogleG() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z" />
    </svg>
  );
}

function MonitorIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="mt-0.5 h-[18px] w-[18px] shrink-0 text-[#6e5226]"
      aria-hidden
    >
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  );
}

/* ───────────── Estilo dos campos (creme com texto escuro) ───────────── */

export const fieldCls =
  "w-full rounded-xl border border-field-line bg-field px-4 py-3 text-[15px] text-field-ink outline-none transition placeholder:text-field-mute focus:border-accent focus:ring-2 focus:ring-accent/30";

/* ───────────────────────── Layout ───────────────────────── */

// Fundo creme, logo (escura) acima e fora da box marrom, e a box em si.
export function AuthShell({
  children,
  footer,
}: {
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="relative grid min-h-screen place-items-center bg-[#f4eee3] px-5 py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(110,82,38,0.10),transparent_60%)]"
      />
      <div className="relative w-full max-w-md">
        {/* Logo acima, fora da box, centralizada */}
        <div className="mb-5 flex justify-center">
          <Image
            src="/kronos-logo-dark.png"
            alt="Kronos"
            width={232}
            height={69}
            priority
            unoptimized
            className="h-12 w-auto select-none"
          />
        </div>

        {/* Aviso: ferramenta feita para computador */}
        <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-[#dcd0bb] bg-[#faf6ee] px-4 py-3 text-[12.5px] leading-snug text-[#5b5249]">
          <MonitorIcon />
          <p>
            <strong className="font-semibold text-[#2a2018]">
              Feito para computador.
            </strong>{" "}
            O Gerador da Kronos é otimizado para desktop. Você pode se cadastrar
            pelo celular, mas para usar a ferramenta acesse de um computador em{" "}
            <strong className="font-semibold text-[#6e5226]">
              kronos-ias.com.br
            </strong>
            .
          </p>
        </div>

        {/* Box marrom */}
        <div className="overflow-hidden rounded-3xl border border-[#3d2c1f] bg-panel shadow-[0_30px_80px_-30px_rgba(40,28,16,0.55)]">
          <div className="px-8 pb-9 pt-8 sm:px-10">{children}</div>
        </div>

        {footer}
      </div>
    </div>
  );
}

// Linha de baixo, FORA da box (sobre o creme) — cores escuras p/ legibilidade.
export function AuthFooter({
  text,
  linkLabel,
  href,
}: {
  text: string;
  linkLabel: string;
  href: string;
}) {
  return (
    <p className="mt-6 text-center text-sm text-[#5b5249]">
      {text}{" "}
      <Link href={href} className="font-semibold text-[#6e5226] hover:underline">
        {linkLabel}
      </Link>
    </p>
  );
}

export function OrDivider() {
  return (
    <div className="my-5 flex items-center gap-3">
      <span className="h-px flex-1 bg-line" />
      <span className="text-xs text-ink-mute">ou</span>
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}

// Botão de login/cadastro com o Google (OAuth 1-clique).
export function GoogleButton({
  label = "Continuar com o Google",
  onError,
}: {
  label?: string;
  onError?: (msg: string) => void;
}) {
  const [loading, setLoading] = useState(false);

  const go = async () => {
    setLoading(true);
    try {
      const supabase = createSupabaseBrowser();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/inicio`,
          queryParams: { prompt: "select_account" },
        },
      });
      if (error) throw error;
      // Em caso de sucesso o browser é redirecionado ao Google — não volta aqui.
    } catch (err) {
      const m = err instanceof Error ? err.message.toLowerCase() : "";
      onError?.(
        m.includes("provider") || m.includes("not enabled")
          ? "Login com Google ainda não está ativo. Use seu e-mail por enquanto."
          : "Não foi possível abrir o Google. Tente novamente.",
      );
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={go}
      disabled={loading}
      className="flex w-full items-center justify-center gap-3 rounded-xl border border-field-line bg-field px-4 py-3 text-[15px] font-medium text-field-ink transition hover:bg-[#efe7d8] disabled:cursor-not-allowed disabled:opacity-70"
    >
      {loading ? <Spinner /> : <GoogleG />}
      {label}
    </button>
  );
}

/* ───────── Tradução das mensagens de erro do Supabase (PT-BR) ───────── */

export function traduzErro(raw: string): string {
  const m = raw.toLowerCase();
  if (m.includes("invalid login credentials"))
    return "E-mail ou senha incorretos.";
  if (m.includes("user already registered") || m.includes("already been registered"))
    return "Este e-mail já tem uma conta. Faça login.";
  if (m.includes("password should be at least"))
    return "A senha precisa ter pelo menos 6 caracteres.";
  if (m.includes("unable to validate email") || m.includes("invalid format"))
    return "E-mail inválido. Confira o endereço digitado.";
  if (m.includes("email not confirmed"))
    return "Confirme seu e-mail antes de entrar (verifique sua caixa de entrada).";
  if (m.includes("for security purposes") || m.includes("rate limit") || m.includes("too many"))
    return "Muitas tentativas. Aguarde alguns segundos e tente de novo.";
  if (m.includes("network") || m.includes("failed to fetch"))
    return "Sem conexão com o servidor. Verifique sua internet.";
  return "Algo deu errado. Tente novamente.";
}
