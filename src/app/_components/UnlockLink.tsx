"use client";

import Link from "next/link";
import { trackFunnel } from "@/lib/analytics/google";

// CTA de desbloqueio (marca d'água → assinatura). Rastreia unlock_click com a
// origem (de onde a pessoa clicou) e leva pra /planos?src=watermark.
export default function UnlockLink({
  from,
  className,
  children,
}: {
  from: string; // trialbar | preview | download
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href="/planos?src=watermark"
      onClick={() => trackFunnel("unlock_click", { from, src: "watermark" })}
      className={className}
    >
      {children}
    </Link>
  );
}
