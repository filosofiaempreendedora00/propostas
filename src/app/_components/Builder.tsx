"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_PROPOSAL } from "@/lib/proposal/defaults";
import { renderProposalHTML, slugify } from "@/lib/proposal/render";
import type { ProposalData, Pain, Solution, Tier } from "@/lib/proposal/types";

const ACCENT_PRESETS = [
  { name: "Champagne", value: "#C9A876" },
  { name: "Azul", value: "#6E8BFF" },
  { name: "Esmeralda", value: "#3FB984" },
  { name: "Coral", value: "#E8765C" },
  { name: "Violeta", value: "#9B6DFF" },
  { name: "Prata", value: "#B8BCC4" },
];

// ---------- pequenos componentes de form ----------
function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.12em] text-ink-mute">
      {children}
    </span>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-line bg-panel-2 px-3 py-2 text-sm text-ink outline-none transition focus:border-accent/60"
    />
  );
}

function TextArea({
  value,
  onChange,
  rows = 3,
}: {
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      rows={rows}
      onChange={(e) => onChange(e.target.value)}
      className="w-full resize-y rounded-lg border border-line bg-panel-2 px-3 py-2 text-sm leading-relaxed text-ink outline-none transition focus:border-accent/60"
    />
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-4 mt-9 border-b border-line pb-2 font-[var(--font-inter)] text-sm font-semibold uppercase tracking-[0.16em] text-accent first:mt-0">
      {children}
    </h2>
  );
}

function MiniBtn({
  children,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md border px-2.5 py-1 text-xs font-medium transition ${
        danger
          ? "border-line text-ink-mute hover:border-red-500/50 hover:text-red-400"
          : "border-line text-ink-soft hover:border-accent/60 hover:text-accent"
      }`}
    >
      {children}
    </button>
  );
}

// ---------- Builder ----------
export default function Builder() {
  const [data, setData] = useState<ProposalData>(DEFAULT_PROPOSAL);

  // Preview com debounce (evita recarregar o iframe a cada tecla).
  const [previewHtml, setPreviewHtml] = useState<string>(() =>
    renderProposalHTML(DEFAULT_PROPOSAL),
  );
  useEffect(() => {
    const id = setTimeout(() => setPreviewHtml(renderProposalHTML(data)), 350);
    return () => clearTimeout(id);
  }, [data]);

  const set = <K extends keyof ProposalData>(key: K, value: ProposalData[K]) =>
    setData((d) => ({ ...d, [key]: value }));

  // ----- pains -----
  const setPain = (i: number, patch: Partial<Pain>) =>
    setData((d) => ({
      ...d,
      pains: d.pains.map((p, idx) => (idx === i ? { ...p, ...patch } : p)),
    }));
  const addPain = () =>
    setData((d) => ({
      ...d,
      pains: [...d.pains, { title: "Nova dor", description: "" }],
    }));
  const removePain = (i: number) =>
    setData((d) => ({ ...d, pains: d.pains.filter((_, idx) => idx !== i) }));

  // ----- solutions -----
  const setSolution = (i: number, patch: Partial<Solution>) =>
    setData((d) => ({
      ...d,
      solutions: d.solutions.map((s, idx) =>
        idx === i ? { ...s, ...patch } : s,
      ),
    }));
  const setSolutionFeatures = (i: number, raw: string) =>
    setSolution(i, { features: raw.split("\n").filter((x) => x.trim() !== "") });
  const addSolution = () =>
    setData((d) => ({
      ...d,
      solutions: [
        ...d.solutions,
        {
          title: `Solução ${d.solutions.length + 1}`,
          description: "",
          features: ["Entregável principal"],
        },
      ],
    }));
  const removeSolution = (i: number) =>
    setData((d) => ({
      ...d,
      solutions: d.solutions.filter((_, idx) => idx !== i),
    }));

  // ----- tiers -----
  const setTier = (i: number, patch: Partial<Tier>) =>
    setData((d) => ({
      ...d,
      tiers: d.tiers.map((t, idx) => (idx === i ? { ...t, ...patch } : t)),
    }));
  const setTierFeatures = (i: number, raw: string) =>
    setTier(i, { features: raw.split("\n").filter((x) => x.trim() !== "") });
  const setFeatured = (i: number) =>
    setData((d) => ({
      ...d,
      tiers: d.tiers.map((t, idx) => ({ ...t, featured: idx === i })),
    }));
  const addTier = () =>
    setData((d) => ({
      ...d,
      tiers: [
        ...d.tiers,
        {
          name: "Novo nível",
          price: "R$ 0",
          priceSuffix: "/mês",
          description: "",
          features: ["Item incluso"],
        },
      ],
    }));
  const removeTier = (i: number) =>
    setData((d) => ({ ...d, tiers: d.tiers.filter((_, idx) => idx !== i) }));

  // ----- export -----
  const exportRef = useRef<HTMLAnchorElement | null>(null);
  const handleExport = () => {
    const html = renderProposalHTML(data);
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = exportRef.current ?? document.createElement("a");
    a.href = url;
    a.download = `proposta-${slugify(data.clientName)}.html`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const solutionsCount = useMemo(() => data.solutions.length, [data.solutions]);

  return (
    <div className="flex h-screen flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between border-b border-line px-6 py-3">
        <div className="flex items-center gap-3">
          <div
            className="grid h-8 w-8 place-items-center rounded-lg font-semibold text-bg"
            style={{ background: data.accent }}
          >
            P
          </div>
          <div>
            <div className="text-sm font-semibold">Gerador de Propostas</div>
            <div className="text-[11px] text-ink-mute">
              {solutionsCount} solução(ões) · {data.tiers.length} níveis
            </div>
          </div>
        </div>
        <button
          onClick={handleExport}
          className="rounded-full px-5 py-2 text-sm font-semibold text-bg transition hover:opacity-90"
          style={{ background: data.accent }}
        >
          ⬇ Baixar HTML
        </button>
        <a ref={exportRef} className="hidden" />
      </header>

      {/* Split */}
      <div className="grid min-h-0 flex-1 grid-cols-[minmax(380px,440px)_1fr]">
        {/* Form */}
        <div className="form-scroll overflow-y-auto border-r border-line px-6 py-6">
          <SectionTitle>Identidade</SectionTitle>
          <div className="grid grid-cols-[1fr_80px] gap-3">
            <label>
              <Label>Sua empresa</Label>
              <TextInput
                value={data.companyName}
                onChange={(v) => set("companyName", v)}
              />
            </label>
            <label>
              <Label>Inicial</Label>
              <TextInput
                value={data.companyInitial}
                onChange={(v) => set("companyInitial", v.slice(0, 2))}
              />
            </label>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <label>
              <Label>Nº da proposta</Label>
              <TextInput
                value={data.proposalNumber}
                onChange={(v) => set("proposalNumber", v)}
              />
            </label>
            <div>
              <Label>Cor de acento</Label>
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {ACCENT_PRESETS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    title={c.name}
                    onClick={() => set("accent", c.value)}
                    className={`h-6 w-6 rounded-full border transition ${
                      data.accent === c.value
                        ? "border-white"
                        : "border-transparent"
                    }`}
                    style={{ background: c.value }}
                  />
                ))}
              </div>
            </div>
          </div>

          <SectionTitle>Cliente &amp; Datas</SectionTitle>
          <label className="block">
            <Label>Nome do cliente (destaque na capa)</Label>
            <TextInput
              value={data.clientName}
              onChange={(v) => set("clientName", v)}
            />
          </label>
          <label className="mt-3 block">
            <Label>Razão social</Label>
            <TextInput
              value={data.clientLegalName}
              onChange={(v) => set("clientLegalName", v)}
            />
          </label>
          <label className="mt-3 block">
            <Label>Subtítulo da capa</Label>
            <TextArea
              value={data.headlineLead}
              onChange={(v) => set("headlineLead", v)}
              rows={2}
            />
          </label>
          <div className="mt-3 grid grid-cols-3 gap-3">
            <label>
              <Label>Data</Label>
              <TextInput
                value={data.dateLabel}
                onChange={(v) => set("dateLabel", v)}
              />
            </label>
            <label>
              <Label>Válida até</Label>
              <TextInput
                value={data.validUntilLabel}
                onChange={(v) => set("validUntilLabel", v)}
              />
            </label>
            <label>
              <Label>Curta (badge)</Label>
              <TextInput
                value={data.validUntilShort}
                onChange={(v) => set("validUntilShort", v)}
              />
            </label>
          </div>

          <SectionTitle>O Desafio</SectionTitle>
          <label className="block">
            <Label>Título</Label>
            <TextInput
              value={data.challengeHeading}
              onChange={(v) => set("challengeHeading", v)}
            />
          </label>
          <label className="mt-3 block">
            <Label>Texto (use **negrito** para destacar)</Label>
            <TextArea
              value={data.challengeStatement}
              onChange={(v) => set("challengeStatement", v)}
              rows={4}
            />
          </label>
          <div className="mt-4 space-y-3">
            {data.pains.map((p, i) => (
              <div
                key={i}
                className="rounded-lg border border-line bg-panel p-3"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-ink-mute">
                    Dor {String(i + 1).padStart(2, "0")}
                  </span>
                  <MiniBtn danger onClick={() => removePain(i)}>
                    remover
                  </MiniBtn>
                </div>
                <TextInput
                  value={p.title}
                  onChange={(v) => setPain(i, { title: v })}
                  placeholder="Título da dor"
                />
                <div className="mt-2">
                  <TextArea
                    value={p.description}
                    onChange={(v) => setPain(i, { description: v })}
                    rows={2}
                  />
                </div>
              </div>
            ))}
            <MiniBtn onClick={addPain}>+ adicionar dor</MiniBtn>
          </div>

          <SectionTitle>Soluções</SectionTitle>
          <label className="block">
            <Label>Título da seção</Label>
            <TextInput
              value={data.solutionsHeading}
              onChange={(v) => set("solutionsHeading", v)}
            />
          </label>
          <label className="mt-3 block">
            <Label>Nota lateral</Label>
            <TextInput
              value={data.solutionsNote}
              onChange={(v) => set("solutionsNote", v)}
            />
          </label>
          <div className="mt-4 space-y-3">
            {data.solutions.map((s, i) => (
              <div
                key={i}
                className="rounded-lg border border-line bg-panel p-3"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-ink-mute">
                    Solução {String(i + 1).padStart(2, "0")}
                  </span>
                  <MiniBtn danger onClick={() => removeSolution(i)}>
                    remover
                  </MiniBtn>
                </div>
                <TextInput
                  value={s.title}
                  onChange={(v) => setSolution(i, { title: v })}
                  placeholder="Título"
                />
                <div className="mt-2">
                  <TextArea
                    value={s.description}
                    onChange={(v) => setSolution(i, { description: v })}
                    rows={2}
                  />
                </div>
                <div className="mt-2">
                  <Label>Itens (um por linha)</Label>
                  <TextArea
                    value={s.features.join("\n")}
                    onChange={(v) => setSolutionFeatures(i, v)}
                    rows={3}
                  />
                </div>
              </div>
            ))}
            <MiniBtn onClick={addSolution}>+ adicionar solução</MiniBtn>
          </div>

          <SectionTitle>Investimento</SectionTitle>
          <label className="block">
            <Label>Título</Label>
            <TextInput
              value={data.investHeading}
              onChange={(v) => set("investHeading", v)}
            />
          </label>
          <div className="mt-4 space-y-3">
            {data.tiers.map((t, i) => (
              <div
                key={i}
                className="rounded-lg border border-line bg-panel p-3"
              >
                <div className="mb-2 flex items-center justify-between">
                  <label className="flex items-center gap-1.5 text-xs font-medium text-ink-mute">
                    <input
                      type="radio"
                      name="featured"
                      checked={!!t.featured}
                      onChange={() => setFeatured(i)}
                      className="accent-[var(--color-accent)]"
                    />
                    Recomendado
                  </label>
                  <MiniBtn danger onClick={() => removeTier(i)}>
                    remover
                  </MiniBtn>
                </div>
                <div className="grid grid-cols-[1fr_90px_70px] gap-2">
                  <TextInput
                    value={t.name}
                    onChange={(v) => setTier(i, { name: v })}
                    placeholder="Nome"
                  />
                  <TextInput
                    value={t.price}
                    onChange={(v) => setTier(i, { price: v })}
                    placeholder="R$ 0"
                  />
                  <TextInput
                    value={t.priceSuffix}
                    onChange={(v) => setTier(i, { priceSuffix: v })}
                    placeholder="/mês"
                  />
                </div>
                <div className="mt-2">
                  <TextInput
                    value={t.description}
                    onChange={(v) => setTier(i, { description: v })}
                    placeholder="Descrição curta"
                  />
                </div>
                <div className="mt-2">
                  <Label>Itens (um por linha)</Label>
                  <TextArea
                    value={t.features.join("\n")}
                    onChange={(v) => setTierFeatures(i, v)}
                    rows={3}
                  />
                </div>
              </div>
            ))}
            <MiniBtn onClick={addTier}>+ adicionar nível</MiniBtn>
          </div>

          <SectionTitle>Fechamento</SectionTitle>
          <label className="block">
            <Label>Título</Label>
            <TextInput
              value={data.closingHeading}
              onChange={(v) => set("closingHeading", v)}
            />
          </label>
          <label className="mt-3 block">
            <Label>Texto</Label>
            <TextArea
              value={data.closingLead}
              onChange={(v) => set("closingLead", v)}
              rows={2}
            />
          </label>
          <label className="mt-3 block">
            <Label>Texto do botão</Label>
            <TextInput
              value={data.ctaLabel}
              onChange={(v) => set("ctaLabel", v)}
            />
          </label>
          <div className="mt-3 grid grid-cols-1 gap-3">
            <label>
              <Label>Responsável</Label>
              <TextInput
                value={data.responsible}
                onChange={(v) => set("responsible", v)}
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label>
                <Label>Telefone</Label>
                <TextInput
                  value={data.phone}
                  onChange={(v) => set("phone", v)}
                />
              </label>
              <label>
                <Label>E-mail</Label>
                <TextInput
                  value={data.email}
                  onChange={(v) => set("email", v)}
                />
              </label>
            </div>
          </div>

          <div className="h-10" />
        </div>

        {/* Preview */}
        <div className="min-h-0 bg-[#0A0B0D]">
          <iframe
            title="Preview da proposta"
            srcDoc={previewHtml}
            className="h-full w-full border-0"
          />
        </div>
      </div>
    </div>
  );
}
