"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { DEFAULT_PROPOSAL } from "@/lib/proposal/defaults";
import { renderProposalHTML, slugify } from "@/lib/proposal/render";
import type { ProposalData, Pain, Tier } from "@/lib/proposal/types";
import { useCatalog } from "@/lib/catalog/store";
import type { CatalogSolution } from "@/lib/catalog/types";
import { Label, TextInput, TextArea, SectionTitle, MiniBtn } from "./fields";

type ClientForm = Omit<ProposalData, "solutions">;

const ACCENT_PRESETS = [
  { name: "Champagne", value: "#C9A876" },
  { name: "Azul", value: "#6E8BFF" },
  { name: "Esmeralda", value: "#3FB984" },
  { name: "Coral", value: "#E8765C" },
  { name: "Violeta", value: "#9B6DFF" },
  { name: "Prata", value: "#B8BCC4" },
];

function toRenderSolution(s: CatalogSolution) {
  const features =
    s.deliverables.length > 0
      ? s.deliverables
      : s.highlights.length > 0
        ? s.highlights
        : s.scope;
  return {
    title: s.name,
    description: s.description || s.tagline,
    features,
  };
}

export default function ClientBuilder() {
  const { items, ready } = useCatalog();

  const [form, setForm] = useState<ClientForm>(() => {
    const { solutions: _omit, ...rest } = DEFAULT_PROPOSAL;
    void _omit;
    return rest;
  });

  // Seleção de soluções (ids do catálogo).
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const seededSelection = useRef(false);
  useEffect(() => {
    if (ready && !seededSelection.current) {
      seededSelection.current = true;
      setSelected(new Set(items.map((s) => s.id)));
    }
  }, [ready, items]);

  const set = <K extends keyof ClientForm>(key: K, value: ClientForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const toggleSolution = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // Dados finais da proposta (form + soluções selecionadas, em ordem do catálogo).
  const data: ProposalData = useMemo(() => {
    const chosen = items.filter((s) => selected.has(s.id)).map(toRenderSolution);
    return { ...form, solutions: chosen };
  }, [form, items, selected]);

  // ----- pains -----
  const setPain = (i: number, patch: Partial<Pain>) =>
    setForm((f) => ({
      ...f,
      pains: f.pains.map((p, idx) => (idx === i ? { ...p, ...patch } : p)),
    }));
  const addPain = () =>
    setForm((f) => ({
      ...f,
      pains: [...f.pains, { title: "Nova dor", description: "" }],
    }));
  const removePain = (i: number) =>
    setForm((f) => ({ ...f, pains: f.pains.filter((_, idx) => idx !== i) }));

  // ----- tiers -----
  const setTier = (i: number, patch: Partial<Tier>) =>
    setForm((f) => ({
      ...f,
      tiers: f.tiers.map((t, idx) => (idx === i ? { ...t, ...patch } : t)),
    }));
  const setTierFeatures = (i: number, raw: string) =>
    setTier(i, { features: raw.split("\n").filter((x) => x.trim() !== "") });
  const setFeatured = (i: number) =>
    setForm((f) => ({
      ...f,
      tiers: f.tiers.map((t, idx) => ({ ...t, featured: idx === i })),
    }));
  const addTier = () =>
    setForm((f) => ({
      ...f,
      tiers: [
        ...f.tiers,
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
    setForm((f) => ({ ...f, tiers: f.tiers.filter((_, idx) => idx !== i) }));

  // ----- preview (debounced) -----
  const [previewHtml, setPreviewHtml] = useState<string>(() =>
    renderProposalHTML(DEFAULT_PROPOSAL),
  );
  useEffect(() => {
    const id = setTimeout(() => setPreviewHtml(renderProposalHTML(data)), 300);
    return () => clearTimeout(id);
  }, [data]);

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

  const selectedCount = data.solutions.length;

  return (
    <div className="flex h-full flex-col">
      {/* Sub-header */}
      <div className="flex items-center justify-between border-b border-line px-6 py-2.5">
        <div className="text-[11px] text-ink-mute">
          {selectedCount} solução(ões) na proposta · {data.tiers.length} níveis
        </div>
        <button
          onClick={handleExport}
          className="rounded-full px-5 py-2 text-sm font-semibold text-bg transition hover:opacity-90"
          style={{ background: form.accent }}
        >
          ⬇ Baixar HTML
        </button>
        <a ref={exportRef} className="hidden" />
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(380px,440px)_1fr]">
        {/* Form */}
        <div className="form-scroll overflow-y-auto border-r border-line px-6 py-6">
          <SectionTitle>Soluções da proposta</SectionTitle>
          {ready && items.length === 0 ? (
            <div className="rounded-lg border border-dashed border-line p-4 text-center text-sm text-ink-soft">
              Nenhuma solução cadastrada.
              <br />
              <Link
                href="/empresa"
                className="mt-2 inline-block font-medium text-accent hover:underline"
              >
                → Cadastrar em Sua Empresa
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="mb-1 text-xs text-ink-mute">
                Selecione quais soluções entram nesta proposta.
              </p>
              {items.map((s) => {
                const on = selected.has(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggleSolution(s.id)}
                    className={`flex w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition ${
                      on
                        ? "border-accent/60 bg-accent/10"
                        : "border-line bg-panel hover:border-line"
                    }`}
                  >
                    <span
                      className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded border text-[10px] ${
                        on
                          ? "border-accent bg-accent text-bg"
                          : "border-ink-mute text-transparent"
                      }`}
                    >
                      ✓
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">
                        {s.icon} {s.name}
                      </span>
                      {s.tagline && (
                        <span className="block truncate text-xs text-ink-mute">
                          {s.tagline}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
              <Link
                href="/empresa"
                className="mt-1 inline-block text-xs text-ink-mute hover:text-accent"
              >
                + gerenciar catálogo em Sua Empresa
              </Link>
            </div>
          )}

          <SectionTitle>Identidade</SectionTitle>
          <div className="grid grid-cols-[1fr_80px] gap-3">
            <label>
              <Label>Sua empresa</Label>
              <TextInput
                value={form.companyName}
                onChange={(v) => set("companyName", v)}
              />
            </label>
            <label>
              <Label>Inicial</Label>
              <TextInput
                value={form.companyInitial}
                onChange={(v) => set("companyInitial", v.slice(0, 2))}
              />
            </label>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <label>
              <Label>Nº da proposta</Label>
              <TextInput
                value={form.proposalNumber}
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
                      form.accent === c.value
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
              value={form.clientName}
              onChange={(v) => set("clientName", v)}
            />
          </label>
          <label className="mt-3 block">
            <Label>Razão social</Label>
            <TextInput
              value={form.clientLegalName}
              onChange={(v) => set("clientLegalName", v)}
            />
          </label>
          <label className="mt-3 block">
            <Label>Subtítulo da capa</Label>
            <TextArea
              value={form.headlineLead}
              onChange={(v) => set("headlineLead", v)}
              rows={2}
            />
          </label>
          <div className="mt-3 grid grid-cols-3 gap-3">
            <label>
              <Label>Data</Label>
              <TextInput
                value={form.dateLabel}
                onChange={(v) => set("dateLabel", v)}
              />
            </label>
            <label>
              <Label>Válida até</Label>
              <TextInput
                value={form.validUntilLabel}
                onChange={(v) => set("validUntilLabel", v)}
              />
            </label>
            <label>
              <Label>Curta (badge)</Label>
              <TextInput
                value={form.validUntilShort}
                onChange={(v) => set("validUntilShort", v)}
              />
            </label>
          </div>

          <SectionTitle>O Desafio</SectionTitle>
          <label className="block">
            <Label>Título</Label>
            <TextInput
              value={form.challengeHeading}
              onChange={(v) => set("challengeHeading", v)}
            />
          </label>
          <label className="mt-3 block">
            <Label>Texto (use **negrito** para destacar)</Label>
            <TextArea
              value={form.challengeStatement}
              onChange={(v) => set("challengeStatement", v)}
              rows={4}
            />
          </label>
          <div className="mt-4 space-y-3">
            {form.pains.map((p, i) => (
              <div key={i} className="rounded-lg border border-line bg-panel p-3">
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

          <SectionTitle>Investimento</SectionTitle>
          <label className="block">
            <Label>Título</Label>
            <TextInput
              value={form.investHeading}
              onChange={(v) => set("investHeading", v)}
            />
          </label>
          <div className="mt-4 space-y-3">
            {form.tiers.map((t, i) => (
              <div key={i} className="rounded-lg border border-line bg-panel p-3">
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
              value={form.closingHeading}
              onChange={(v) => set("closingHeading", v)}
            />
          </label>
          <label className="mt-3 block">
            <Label>Texto</Label>
            <TextArea
              value={form.closingLead}
              onChange={(v) => set("closingLead", v)}
              rows={2}
            />
          </label>
          <label className="mt-3 block">
            <Label>Texto do botão</Label>
            <TextInput
              value={form.ctaLabel}
              onChange={(v) => set("ctaLabel", v)}
            />
          </label>
          <div className="mt-3 grid grid-cols-1 gap-3">
            <label>
              <Label>Responsável</Label>
              <TextInput
                value={form.responsible}
                onChange={(v) => set("responsible", v)}
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label>
                <Label>Telefone</Label>
                <TextInput
                  value={form.phone}
                  onChange={(v) => set("phone", v)}
                />
              </label>
              <label>
                <Label>E-mail</Label>
                <TextInput
                  value={form.email}
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
