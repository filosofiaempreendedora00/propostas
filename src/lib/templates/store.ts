"use client";

import { useCallback, useEffect, useState } from "react";
import type { ProposalData } from "@/lib/proposal/types";
import { DEFAULT_PROPOSAL } from "@/lib/proposal/defaults";
import type { BlockTemplate, BlockKey } from "./types";
import { BLOCKS, BLOCK_FIELDS } from "./types";

const KEY = "propostas.templates.v1";

function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return "tpl-" + Math.abs(Date.now()).toString(36);
}

// Extrai do default só os campos do bloco.
export function pickDefault(block: BlockKey): Partial<ProposalData> {
  return BLOCK_FIELDS[block].reduce<Partial<ProposalData>>(
    (acc, f) => ({ ...acc, [f]: DEFAULT_PROPOSAL[f] }),
    {},
  );
}

export function blankTemplate(block: BlockKey, name: string): BlockTemplate {
  return { id: uid(), block, name, payload: pickDefault(block) };
}

function load(): BlockTemplate[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as BlockTemplate[]) : [];
  } catch {
    return [];
  }
}

function save(items: BlockTemplate[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    /* ignora */
  }
}

// 3 variações por bloco no primeiro acesso.
const SEED: BlockTemplate[] = BLOCKS.flatMap((b) => [
  { id: `seed-${b.key}-1`, block: b.key, name: "Padrão", payload: pickDefault(b.key) },
  { id: `seed-${b.key}-2`, block: b.key, name: "Alternativa A", payload: pickDefault(b.key) },
  { id: `seed-${b.key}-3`, block: b.key, name: "Alternativa B", payload: pickDefault(b.key) },
]);

export function useTemplates() {
  const [items, setItems] = useState<BlockTemplate[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let initial = load();
    if (initial.length === 0) {
      initial = SEED;
      save(initial);
    }
    setItems(initial);
    setReady(true);
  }, []);

  const add = useCallback((block: BlockKey): string => {
    const t = blankTemplate(block, "Nova variação");
    setItems((prev) => {
      const next = [...prev, t];
      save(next);
      return next;
    });
    return t.id;
  }, []);

  const update = useCallback(
    (id: string, patch: Partial<BlockTemplate>) => {
      setItems((prev) => {
        const next = prev.map((t) => (t.id === id ? { ...t, ...patch } : t));
        save(next);
        return next;
      });
    },
    [],
  );

  const remove = useCallback((id: string) => {
    setItems((prev) => {
      const next = prev.filter((t) => t.id !== id);
      save(next);
      return next;
    });
  }, []);

  return { items, ready, add, update, remove };
}
