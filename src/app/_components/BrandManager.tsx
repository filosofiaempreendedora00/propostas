"use client";

import { useRef, useState } from "react";
import { useCompany } from "@/lib/company/store";

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB (arquivo de origem)
const MAX_DIM = 800; // maior lado após compressão (logo não precisa de mais)

function readAsDataURL(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = () => rej(new Error("read"));
    r.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => rej(new Error("img"));
    img.src = src;
  });
}

// Redimensiona/comprime para um PNG leve (preserva transparência).
// SVG é vetorial e já leve — mantém como está.
async function compressLogo(file: File): Promise<string> {
  const dataUrl = await readAsDataURL(file);
  if (file.type === "image/svg+xml") return dataUrl;
  const img = await loadImage(dataUrl);
  const scale = Math.min(1, MAX_DIM / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL("image/png");
}

function LogoSlot({
  title,
  hint,
  badge,
  value,
  onChange,
  previewBg,
}: {
  title: string;
  hint: string;
  badge: string;
  value: string | null;
  onChange: (v: string | null) => void;
  previewBg: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Envie um arquivo de imagem (PNG de preferência).");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Arquivo muito grande — máximo 2 MB.");
      return;
    }
    setError(null);
    compressLogo(file)
      .then(onChange)
      .catch(() => setError("Não consegui processar a imagem. Tente outra."));
  };

  return (
    <div className="rounded-2xl border border-line bg-panel/30 p-4">
      <div className="mb-1 flex items-center gap-2">
        <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
          {badge}
        </span>
        <span className="text-sm font-semibold text-ink">{title}</span>
      </div>
      <p className="mb-3 text-xs text-ink-mute">{hint}</p>

      {value ? (
        <>
          <div
            className="grid h-28 place-items-center rounded-xl border border-line p-4"
            style={{ background: previewBg }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value}
              alt={title}
              className="max-h-16 max-w-full object-contain"
            />
          </div>
          <div className="mt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="text-xs font-medium text-accent hover:underline"
            >
              Trocar
            </button>
            <button
              type="button"
              onClick={() => onChange(null)}
              className="text-xs text-ink-mute transition hover:text-red-400"
            >
              Remover
            </button>
          </div>
        </>
      ) : (
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) =>
            (e.key === "Enter" || e.key === " ") && inputRef.current?.click()
          }
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            onFiles(e.dataTransfer.files);
          }}
          className={`grid h-28 cursor-pointer place-items-center rounded-xl border-2 border-dashed px-4 text-center transition ${
            drag
              ? "border-accent bg-accent/10"
              : "border-line hover:border-accent/50 hover:bg-panel/40"
          }`}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mb-2 h-7 w-7 text-accent"
            aria-hidden
          >
            <path d="M12 16V4M7 9l5-5 5 5" />
            <path d="M5 16v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2" />
          </svg>
          <div className="text-xs font-medium text-ink">
            Arraste ou <span className="text-accent">clique para escolher</span>
          </div>
          <div className="mt-0.5 text-[11px] text-ink-mute">PNG, SVG ou WebP</div>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/svg+xml,image/webp"
        className="hidden"
        onChange={(e) => onFiles(e.target.files)}
      />
      {error && <p className="mt-2 text-xs text-red-400">⚠ {error}</p>}
    </div>
  );
}

export default function BrandManager() {
  const { logo, logoDark, ready, setLogo, setLogoDark } = useCompany();

  return (
    <div className="form-scroll h-full overflow-y-auto">
      <div className="max-w-3xl px-10 py-9">
        <div className="mb-7 border-b border-line pb-5">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">
            Sua marca
          </h1>
          <p className="mt-1.5 text-sm text-ink-mute">
            Cadastre duas versões da sua logo. No Gerador, a versão certa é
            escolhida automaticamente conforme o tema da proposta.
          </p>
        </div>

        {!ready ? (
          <p className="text-sm text-ink-mute">Carregando…</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <LogoSlot
              badge="Fundo escuro"
              title="Logo clara"
              hint="Usada quando a proposta está no tema escuro. Envie a versão clara/branca da sua logo."
              value={logo}
              onChange={setLogo}
              previewBg="#0A0B0D"
            />
            <LogoSlot
              badge="Fundo claro"
              title="Logo escura"
              hint="Usada quando a proposta está no tema claro. Envie a versão escura/colorida da sua logo."
              value={logoDark}
              onChange={setLogoDark}
              previewBg="#FBF9F5"
            />
          </div>
        )}

        {/* Dica de vínculo com o Gerador */}
        <div className="mt-5 rounded-xl border border-accent/30 bg-accent/[0.06] p-4 text-sm leading-relaxed text-ink-soft">
          🎨 <strong className="text-ink">Ligado ao Gerador:</strong> ao trocar o
          tema do documento (claro/escuro) na aba <strong>Aparência</strong> do
          Gerador, a logo correspondente entra sozinha na capa. Se você cadastrar
          só uma, ela é usada nos dois temas.
        </div>

        {/* Boas práticas */}
        <div className="mt-4 rounded-xl border border-line bg-panel/40 p-4">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
            Boas práticas
          </div>
          <ul className="space-y-1.5 text-sm text-ink-soft">
            <li>
              • <strong className="text-ink">PNG com fundo transparente</strong>{" "}
              (sem retângulo branco/preto atrás).
            </li>
            <li>
              • Proporção <strong className="text-ink">horizontal</strong>{" "}
              (wordmark/lockup fica melhor que ícone quadrado).
            </li>
            <li>
              • Altura de pelo menos{" "}
              <strong className="text-ink">200&nbsp;px</strong> — nitidez em telas
              retina.
            </li>
            <li>
              • Até <strong className="text-ink">2&nbsp;MB</strong> cada.
            </li>
          </ul>
        </div>

        <p className="mt-4 text-xs text-ink-mute">
          ✓ Salva automaticamente. Aparece na capa do <strong>Gerador</strong>.
        </p>
      </div>
    </div>
  );
}
