import Link from "next/link";
import UsageBadge from "./UsageBadge";

// Número e mensagem do WhatsApp (dúvidas sobre a assinatura).
const WHATSAPP = "5527998001953";
const WHATSAPP_MSG =
  "Olá! Estou no teste gratuito do gerador de propostas e queria tirar dúvidas sobre a assinatura.";
const whatsappUrl = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(WHATSAPP_MSG)}`;

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
      <path d="M12 2a10 10 0 0 0-8.5 15.2L2 22l4.9-1.4A10 10 0 1 0 12 2zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-2.9.8.8-2.8-.2-.3A8.2 8.2 0 1 1 12 20.2z" />
      <path d="M17.5 14.4c-.3-.1-1.7-.8-1.9-.9-.3-.1-.5-.1-.7.1-.2.3-.7.9-.8 1-.2.2-.3.2-.6.1-.3-.2-1.2-.5-2.3-1.4-.8-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6l.4-.5c.1-.2.2-.3.2-.5.1-.2 0-.4 0-.5l-.8-2c-.2-.5-.4-.5-.6-.5h-.5c-.2 0-.5.1-.7.3-.2.3-.9.9-.9 2.1 0 1.3.9 2.5 1 2.7.1.2 1.8 2.8 4.4 3.9.6.3 1.1.4 1.4.5.6.2 1.2.2 1.6.1.5-.1 1.6-.7 1.8-1.3.2-.6.2-1.2.2-1.3-.1-.2-.3-.2-.5-.3z" />
    </svg>
  );
}

// Faixa de teste gratuito — fixa no topo, em todas as telas do app.
// Mostra de forma elegante quantas propostas grátis ainda restam.
export default function TrialBar({
  remaining,
  limit,
}: {
  remaining: number;
  limit: number;
}) {
  return (
    <div className="flex shrink-0 flex-wrap items-center justify-center gap-x-4 gap-y-2 bg-accent px-4 py-3 text-white">
      <span className="text-sm font-medium sm:text-[15px]">
        Você está em um teste gratuito
      </span>
      <UsageBadge initialRemaining={remaining} limit={limit} />
      <div className="flex items-center gap-2.5">
        <Link
          href="/planos"
          className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-[#2a2018] transition hover:opacity-90"
        >
          Ver planos
        </Link>
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 rounded-full border border-white/45 px-5 py-2 text-sm font-semibold text-white transition hover:bg-white/15"
        >
          <WhatsAppIcon />
          Falar no WhatsApp
        </a>
      </div>
    </div>
  );
}
