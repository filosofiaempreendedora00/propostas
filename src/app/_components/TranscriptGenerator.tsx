"use client";

import { useEffect, useRef, useState } from "react";
import type { ProposalData } from "@/lib/proposal/types";
import { trackFunnel } from "@/lib/analytics/google";
import CyclingText from "./CyclingText";

// Tamanho legível do arquivo anexado (ex.: "312 KB", "1,4 MB").
function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}

// Mensagens que trocam enquanto a IA lê a call e escreve a proposta — o "como"
// da persuasão, pra a espera virar expectativa em vez de tédio.
const PROPOSAL_STEPS = [
  "Ouvindo a conversa com atenção…",
  "Tocando nas dores certas…",
  "Aguçando o desejo…",
  "Incrementando a persuasão…",
  "Falando o que o cliente quer ouvir…",
  "Montando uma oferta irresistível…",
  "Ancorando o valor…",
  "Conectando com o momento dele…",
  "Fechando com um convite irrecusável…",
] as const;

// Sobe o transcript da call (PDF/DOCX/TXT) → a IA lê e personaliza os blocos da
// proposta com as dores/desejos REAIS daquele cliente. O arquivo é ANEXADO e só
// gera ao clicar no botão (não dispara ao soltar). Aplica no form via onApply.
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
  const [pendingFile, setPendingFile] = useState<File | null>(null); // anexado, aguardando OK
  const [progress, setProgress] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Limpa o timer da barra se o componente desmontar no meio.
  useEffect(() => {
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, []);

  const send = async (file: File) => {
    setError(null);
    setDone(null);
    setFileName(file.name);
    setLoading(true);
    setProgress(0);
    trackFunnel("transcript_uploaded", {
      ext: file.name.split(".").pop()?.toLowerCase() ?? "",
    });
    // Barra fiel ao tempo real: curva assintótica calibrada p/ ~1 min (parse +
    // IA varia). Avança pelo tempo decorrido e NUNCA chega a 100% sozinha — só
    // ao receber o resultado. Sem contagem de segundos, pra não prometer prazo.
    const start = performance.now();
    timer.current = setInterval(() => {
      const s = (performance.now() - start) / 1000;
      setProgress(Math.min(94, (1 - Math.exp(-s / 26)) * 100));
    }, 150);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/transcript", { method: "POST", body: fd });
      const data = (await res.json().catch(() => ({}))) as {
        clientName?: string;
        blocks?: Partial<ProposalData>;
        error?: string;
      };
      if (timer.current) clearInterval(timer.current);
      if (!res.ok) {
        trackFunnel("transcript_failed", {
          status: res.status,
          reason: (data?.error || "").slice(0, 80),
        });
        setError(data?.error || "Não consegui processar o arquivo. Tente de novo.");
        return;
      }
      setProgress(100); // completa a barra visualmente antes de mostrar o sucesso
      await new Promise((r) => setTimeout(r, 300));
      onApply(String(data.clientName || ""), data.blocks || {});
      trackFunnel("transcript_generated", {});
      setPendingFile(null); // sucesso: limpa o anexo (volta pra dropzone)
      setDone(
        data.clientName
          ? `Proposta personalizada para ${data.clientName} — revise no preview ao lado.`
          : "Proposta personalizada a partir da call — revise no preview ao lado.",
      );
    } catch {
      if (timer.current) clearInterval(timer.current);
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
          if (f) setPendingFile(f); // anexa; só gera no botão
          e.target.value = ""; // permite reescolher o mesmo arquivo
        }}
      />

      {loading ? (
        <div className="rounded-xl border border-accent/40 bg-accent/[0.06] px-4 py-4 text-center">
          <div className="mx-auto mb-2 h-5 w-5 animate-spin rounded-full border-2 border-accent/30 border-t-accent" />
          <p className="text-[13.5px] font-semibold text-ink">
            <CyclingText messages={PROPOSAL_STEPS} />
          </p>
          <p className="mt-0.5 truncate text-[11px] text-ink-mute">{fileName}</p>
          {/* Barra fiel ao tempo — previsibilidade do quanto falta. */}
          <div className="mx-auto mt-3 max-w-xs">
            <div className="h-2 overflow-hidden rounded-full bg-panel-2">
              <div
                className="h-full rounded-full bg-accent"
                style={{ width: `${progress}%`, transition: "width 0.3s ease-out" }}
              />
            </div>
          </div>
          <p className="mt-2 text-[11px] text-ink-mute">
            Personalizando a proposta com o que apareceu na call — leva alguns
            instantes.
          </p>
        </div>
      ) : pendingFile ? (
        /* ANEXADO — confira, remova ou gere. Nada roda sem o botão. */
        <div>
          <div className="flex items-center gap-3 rounded-2xl border-2 border-accent/40 bg-accent/[0.06] px-3.5 py-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent/15 text-accent">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
                className="h-5 w-5"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <path d="M14 2v6h6" />
              </svg>
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-ink">
                {pendingFile.name}
              </div>
              <div className="text-[11px] text-ink-mute">
                {fmtSize(pendingFile.size)} · anexado
              </div>
            </div>
            <button
              type="button"
              onClick={() => setPendingFile(null)}
              title="Remover arquivo"
              className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-lg text-ink-mute transition hover:bg-panel-2 hover:text-red-400"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
                className="h-4 w-4"
              >
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
          <button
            type="button"
            onClick={() => pendingFile && void send(pendingFile)}
            className="kronos-btn-glow mt-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-bold text-bg transition hover:opacity-90"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="h-4 w-4">
              <path d="M12 2c0 5-5 10-10 10 5 0 10 5 10 10 0-5 5-10 10-10-5 0-10-5-10-10z" />
            </svg>
            Gerar proposta com a IA
            <span aria-hidden>→</span>
          </button>
          <p className="mt-2 text-center text-[11px] text-ink-mute">
            Nada é gerado até você clicar aqui.
          </p>
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
            if (f) setPendingFile(f); // anexa; só gera no botão
          }}
          className={`kronos-btn-glow flex w-full cursor-pointer flex-col items-center gap-2.5 rounded-2xl border-2 border-dashed px-4 py-9 text-center transition ${
            dragOver
              ? "border-accent bg-accent/[0.12]"
              : "border-accent/45 bg-accent/[0.05] hover:border-accent hover:bg-accent/[0.1]"
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
