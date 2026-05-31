"use client";

import type { BlockTemplate } from "@/lib/templates/types";
import type { Pillar, Step, ProposalData } from "@/lib/proposal/types";
import { Label, TextInput, TextArea, ItemList, MiniBtn } from "./fields";

type Pair = { title: string; description: string };

function PairList({
  items,
  onChange,
  addLabel,
}: {
  items: Pair[];
  onChange: (v: Pair[]) => void;
  addLabel: string;
}) {
  const setItem = (i: number, patch: Partial<Pair>) =>
    onChange(items.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  return (
    <div className="space-y-3">
      {items.map((it, i) => (
        <div key={i} className="rounded-lg border border-line bg-panel p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-ink-mute">
              {String(i + 1).padStart(2, "0")}
            </span>
            <MiniBtn danger onClick={() => onChange(items.filter((_, j) => j !== i))}>
              remover
            </MiniBtn>
          </div>
          <TextInput
            value={it.title}
            onChange={(v) => setItem(i, { title: v })}
            placeholder="Título"
          />
          <div className="mt-2">
            <TextArea
              value={it.description}
              onChange={(v) => setItem(i, { description: v })}
              rows={2}
              placeholder="Descrição"
            />
          </div>
        </div>
      ))}
      <MiniBtn onClick={() => onChange([...items, { title: "Novo", description: "" }])}>
        {addLabel}
      </MiniBtn>
    </div>
  );
}

export default function TemplateEditor({
  template,
  update,
}: {
  template: BlockTemplate;
  update: (id: string, patch: Partial<BlockTemplate>) => void;
}) {
  const p = template.payload;
  const setField = (patch: Partial<ProposalData>) =>
    update(template.id, { payload: { ...p, ...patch } });
  const txt = (v: string | undefined) => v ?? "";

  return (
    <div className="space-y-5">
        {template.block === "understanding" && (
          <>
            <Field label="Título do bloco">
              <TextInput
                value={txt(p.understandingHeading)}
                onChange={(v) => setField({ understandingHeading: v })}
              />
            </Field>
            <div className="grid grid-cols-2 gap-5">
              <Field label="Situação atual">
                <TextArea
                  value={txt(p.currentSituation)}
                  onChange={(v) => setField({ currentSituation: v })}
                  rows={3}
                />
              </Field>
              <Field label="Gargalo principal">
                <TextArea
                  value={txt(p.mainBottleneck)}
                  onChange={(v) => setField({ mainBottleneck: v })}
                  rows={3}
                />
              </Field>
              <Field label="Oportunidade">
                <TextArea
                  value={txt(p.opportunity)}
                  onChange={(v) => setField({ opportunity: v })}
                  rows={3}
                />
              </Field>
              <Field label="Objetivo">
                <TextArea
                  value={txt(p.objective)}
                  onChange={(v) => setField({ objective: v })}
                  rows={3}
                />
              </Field>
            </div>
          </>
        )}

        {template.block === "cost" && (
          <>
            <Field label="Pergunta central">
              <TextInput
                value={txt(p.costQuestion)}
                onChange={(v) => setField({ costQuestion: v })}
              />
            </Field>
            <Field label="Consequência operacional">
              <TextArea
                value={txt(p.costOperational)}
                onChange={(v) => setField({ costOperational: v })}
                rows={2}
              />
            </Field>
            <Field label="Consequência financeira">
              <TextArea
                value={txt(p.costFinancial)}
                onChange={(v) => setField({ costFinancial: v })}
                rows={2}
              />
            </Field>
            <Field label="Consequência estratégica">
              <TextArea
                value={txt(p.costStrategic)}
                onChange={(v) => setField({ costStrategic: v })}
                rows={2}
              />
            </Field>
          </>
        )}

        {template.block === "strategy" && (
          <>
            <Field label="Título do bloco">
              <TextInput
                value={txt(p.strategyHeading)}
                onChange={(v) => setField({ strategyHeading: v })}
              />
            </Field>
            <Field label="Introdução">
              <TextArea
                value={txt(p.strategyIntro)}
                onChange={(v) => setField({ strategyIntro: v })}
                rows={2}
              />
            </Field>
            <Field label="Pilares">
              <PairList
                items={(p.pillars as Pillar[] | undefined) ?? []}
                onChange={(v) => setField({ pillars: v })}
                addLabel="+ adicionar pilar"
              />
            </Field>
          </>
        )}

        {template.block === "solutions" && (
          <>
            <Field label="Título do bloco">
              <TextInput
                value={txt(p.solutionsHeading)}
                onChange={(v) => setField({ solutionsHeading: v })}
              />
            </Field>
            <Field label="Nota / subtítulo">
              <TextArea
                value={txt(p.solutionsNote)}
                onChange={(v) => setField({ solutionsNote: v })}
                rows={2}
              />
            </Field>
            <p className="text-xs text-ink-mute">
              As soluções em si vêm do catálogo (Sua Empresa). Aqui você varia só
              a introdução do bloco.
            </p>
          </>
        )}

        {template.block === "consultantRec" && (
          <>
            <Field label="Título">
              <TextInput
                value={txt(p.consultantRecHeading)}
                onChange={(v) => setField({ consultantRecHeading: v })}
              />
            </Field>
            <Field label="Texto da recomendação">
              <TextArea
                value={txt(p.consultantRecText)}
                onChange={(v) => setField({ consultantRecText: v })}
                rows={3}
              />
            </Field>
            <div className="block">
              <Label>Motivos</Label>
              <ItemList
                value={(p.consultantRecReasons as string[] | undefined) ?? []}
                onChange={(v) => setField({ consultantRecReasons: v })}
                placeholder="Um motivo que reforça a recomendação"
                addLabel="+ adicionar motivo"
              />
            </div>
          </>
        )}

        {template.block === "nextSteps" && (
          <>
            <Field label="Título do bloco">
              <TextInput
                value={txt(p.nextStepsHeading)}
                onChange={(v) => setField({ nextStepsHeading: v })}
              />
            </Field>
            <Field label="Passos">
              <PairList
                items={(p.steps as Step[] | undefined) ?? []}
                onChange={(v) => setField({ steps: v })}
                addLabel="+ adicionar passo"
              />
            </Field>
          </>
        )}

        <p className="pt-1 text-xs text-ink-mute">
          ✓ Alterações salvas automaticamente neste navegador.
        </p>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <Label>{label}</Label>
      {children}
    </label>
  );
}
