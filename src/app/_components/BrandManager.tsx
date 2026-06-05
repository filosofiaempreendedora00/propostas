"use client";

import { useRef, useState } from "react";
import { useCompany } from "@/lib/company/store";

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB

export default function BrandManager() {
  const { logo, ready, setLogo } = useCompany();
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
    const reader = new FileReader();
    reader.onload = () => {
      setError(null);
      setLogo(String(reader.result));
    };
    reader.onerror = () => setError("Não consegui ler o arquivo. Tente outro.");
    reader.readAsDataURL(file);
  };

  return (
    <div className="form-scroll h-full overflow-y-auto">
      <div className="max-w-3xl px-10 py-9">
        <div className="mb-7 border-b border-line pb-5">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">
            Sua marca
          </h1>
          <p className="mt-1.5 text-sm text-ink-mute">
            A logo da sua empresa aparece na capa da proposta (e no arquivo
            baixado).
          </p>
        </div>

        <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.12em] text-ink-mute">
          Logo da empresa
        </span>

        {/* Dropzone */}
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
          className={`grid cursor-pointer place-items-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition ${
            drag
              ? "border-accent bg-accent/10"
              : "border-line hover:border-accent/50 hover:bg-panel/40"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/svg+xml,image/webp"
            className="hidden"
            onChange={(e) => onFiles(e.target.files)}
          />
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mb-3 h-8 w-8 text-accent"
            aria-hidden
          >
            <path d="M12 16V4M7 9l5-5 5 5" />
            <path d="M5 16v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2" />
          </svg>
          <div className="text-sm font-medium text-ink">
            Arraste a logo aqui ou{" "}
            <span className="text-accent">clique para escolher</span>
          </div>
          <div className="mt-1 text-xs text-ink-mute">PNG, SVG ou WebP</div>
        </div>

        {error && (
          <p className="mt-2 text-xs text-red-400">⚠ {error}</p>
        )}

        {/* Preview da logo atual (em tema escuro e claro) */}
        {ready && logo && (
          <div className="mt-5">
            <span className="mb-2 block text-[11px] font-medium uppercase tracking-[0.12em] text-ink-mute">
              Pré-visualização
            </span>
            <div className="grid grid-cols-2 gap-3">
              {[
                { bg: "#0A0B0D", label: "No tema escuro" },
                { bg: "#FBF9F5", label: "No tema claro" },
              ].map((s) => (
                <div key={s.bg}>
                  <div
                    className="grid h-24 place-items-center rounded-xl border border-line p-4"
                    style={{ background: s.bg }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={logo}
                      alt="Logo da empresa"
                      className="max-h-12 max-w-full object-contain"
                    />
                  </div>
                  <div className="mt-1 text-center text-[11px] text-ink-mute">
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setLogo(null)}
              className="mt-3 rounded-md border border-line px-3 py-1.5 text-xs font-medium text-ink-mute transition hover:border-red-500/50 hover:text-red-400"
            >
              Remover logo
            </button>
          </div>
        )}

        {/* Boas práticas */}
        <div className="mt-7 rounded-xl border border-line bg-panel/40 p-4">
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
              • Até <strong className="text-ink">2&nbsp;MB</strong>.
            </li>
            <li>
              • Escolha uma versão que{" "}
              <strong className="text-ink">contraste</strong> com o tema da
              proposta (clara p/ fundo escuro, escura p/ fundo claro).
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
