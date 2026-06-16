// Offline buffering for the competition wizard (Ch12). The wizard's in-memory
// state is serialized to localStorage so a reload or network blip mid-entry never
// loses work. Pure (no DOM) so it's unit-tested; the component does the storage I/O.

import type { Category } from "@/lib/categories";

export const DRAFT_KEY = "lgj:competition-wizard";

export type Draft = Record<string, string>;

export type WizardEntry = {
  id: string;
  athleteId: string;
  athleteName: string;
  category: Category;
  repertoire: { kataId: string; kataName: string }[];
  draft: Draft;
};

export type WizardComp = {
  name: string;
  date: string;
  competitionType: string;
  location: string;
  notes: string;
};

export type WizardDraft = {
  step: number;
  competitionId: string | null;
  comp: WizardComp;
  // athleteId → chosen age categories (plain object so it JSON-serializes for the buffer).
  picks: Record<string, string[]>;
  entries: WizardEntry[];
};

export function serializeDraft(d: WizardDraft): string {
  return JSON.stringify(d);
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === "string");
}

function isStringArrayRecord(v: unknown): v is Record<string, string[]> {
  return (
    typeof v === "object" &&
    v !== null &&
    !Array.isArray(v) &&
    Object.values(v).every(isStringArray)
  );
}

/** Parse a stored draft, returning null on anything malformed (never throws). */
export function parseDraft(raw: string | null): WizardDraft | null {
  if (!raw) return null;
  let obj: unknown;
  try {
    obj = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof obj !== "object" || obj === null) return null;
  const o = obj as Record<string, unknown>;
  if (
    typeof o.step !== "number" ||
    !(o.competitionId === null || typeof o.competitionId === "string") ||
    typeof o.comp !== "object" ||
    o.comp === null ||
    !isStringArrayRecord(o.picks) ||
    !Array.isArray(o.entries)
  ) {
    return null;
  }
  for (const e of o.entries) {
    if (typeof e !== "object" || e === null) return null;
    const ee = e as Record<string, unknown>;
    if (
      typeof ee.id !== "string" ||
      typeof ee.athleteId !== "string" ||
      typeof ee.category !== "string"
    ) {
      return null;
    }
  }
  return o as unknown as WizardDraft;
}
