"use client";

import { useRef, useState } from "react";
import type { ProposalData } from "@/lib/proposal/types";
import { trackFunnel } from "@/lib/analytics/google";

// Sobe o transcript da call (PDF/DOCX/TXT) → a IA lê e personaliza os blocos da
// proposta com as dores/desejos REAIS daquele cliente. Aplica no form do builder
// via onApply. Loading e erro tratados; nunca "engole" a falha em silêncio.
export default function TranscriptGenerator({
  onApply,
}: {
  onApply: (clientName: string, blocks: Partial<ProposalData>) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const send = async (file: File) => {
    setError(null);
    setDone(null);
    setFileName(file.name);
    setLoading(true);
    trackFunnel("transcript_uploaded", {
      ext: file.name.split(".").pop()?.toLowerCase() ?? "",
    });
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/transcript", { method: "POST", body: fd });
      const data = (await res.json().catch(() => ({}))) as {
        clientName?: string;
        blocks?: Partial<ProposalData>;
        error?: string;
      };
      if (!res.ok) {
        trackFunnel("transcript_failed", {
          status: res.status,
          reason: (data?.error || "").slice(0, 80),
        });
        setError(data?.error || "Não consegui processar o arquivo. Tente de novo.");
        return;
      }
      onApply(String(data.clientName || ""), data.blocks || {});
      trackFunnel("transcript_generated", {});
      setDone(
        data.clientName
          ? `Proposta personalizada para ${data.clientName} — revise no preview ao lado.`
          : "Proposta personalizada a partir da call — revise no preview ao lado.",
      );
    } catch {
      trackFunnel("transcript_failed", { reason: "network" });
      setError("Falha de rede ao enviar. Tente de novo.");
    } finally {
      setLoading(false);
    }
  };

  const ACCEPT = ".pdf,.docx,.txt";

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void send(f);
          e.target.value = ""; // permite reenviar o mesmo arquivo
        }}
      />

      {loading ? (
        <div className="rounded-xl border border-accent/40 bg-accent/[0.06] px-4 py-4 text-center">
          <div className="mx-auto mb-2 h-5 w-5 animate-spin rounded-full border-2 border-accent/30 border-t-accent" />
          <p className="text-[13px] font-medium text-ink">
            Lendo sua call e personalizando a proposta…
          </p>
          <p className="mt-0.5 truncate text-[11px] text-ink-mute">{fileName}</p>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const f = e.dataTransfer.files?.[0];
            if (f) void send(f);
          }}
          className={`flex w-full cursor-pointer flex-col items-center gap-2.5 rounded-2xl border-2 border-dashed px-4 py-9 text-center transition ${
            dragOver
              ? "border-accent bg-accent/[0.12]"
              : "border-accent/40 bg-accent/[0.05] hover:border-accent hover:bg-accent/[0.1]"
          }`}
        >
          <span className="grid h-11 w-11 place-items-center rounded-full bg-accent/12 text-accent">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
              aria-hidden
            >
              <path d="M12 16V4M7 9l5-5 5 5" />
              <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
            </svg>
          </span>
          <span className="text-sm font-semibold text-ink">
            Subir o transcript da call de vendas
          </span>
          <span className="text-[11px] text-ink-mute">
            Arraste aqui ou clique · PDF, DOCX ou TXT
          </span>
        </button>
      )}

      {error && (
        <p className="mt-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-[12px] text-red-500">
          {error}
        </p>
      )}
      {done && (
        <p className="mt-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-[12px] text-emerald-500">
          ✓ {done}
        </p>
      )}
    </div>
  );
}
