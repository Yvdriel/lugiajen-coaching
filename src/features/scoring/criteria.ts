import type { kataScoringCards } from "@/db/schema";

// Single source of truth for the scoring card's 12 WKF criteria + overall (convention 8).
// Form, history table, zod schema and nl copy all derive from these lists — no drift.

export type CriterionGroup = "technical" | "athletic" | "overall";

// Numeric criteria keys map 1:1 to `kata_scoring_cards` integer columns (0-100).
export type NumericCriterionKey =
  | "stances"
  | "techniques"
  | "transitions"
  | "timing"
  | "breathing"
  | "kiai"
  | "kime"
  | "conformance"
  | "strength"
  | "speed"
  | "balance"
  | "rhythm"
  | "overallImpression";

export type Criterion = {
  key: NumericCriterionKey;
  group: CriterionGroup;
};

// Ordered as rendered: technical (8) → athletic (4) → overall (1) = 13 numeric fields.
export const NUMERIC_CRITERIA: readonly Criterion[] = [
  { key: "stances", group: "technical" },
  { key: "techniques", group: "technical" },
  { key: "transitions", group: "technical" },
  { key: "timing", group: "technical" },
  { key: "breathing", group: "technical" },
  { key: "kiai", group: "technical" },
  { key: "kime", group: "technical" },
  { key: "conformance", group: "technical" },
  { key: "strength", group: "athletic" },
  { key: "speed", group: "athletic" },
  { key: "balance", group: "athletic" },
  { key: "rhythm", group: "athletic" },
  { key: "overallImpression", group: "overall" },
] as const;

export const CRITERION_GROUPS: readonly CriterionGroup[] = [
  "technical",
  "athletic",
  "overall",
] as const;

export function criteriaForGroup(group: CriterionGroup): readonly Criterion[] {
  return NUMERIC_CRITERIA.filter((c) => c.group === group);
}

// The 12 coach-entered criteria (technical + athletic). `overallImpression` is NOT an
// input — it is derived from these (convention: overall = mean of the 12, see computeOverall).
export type InputCriterionKey = Exclude<NumericCriterionKey, "overallImpression">;

export const INPUT_CRITERIA: readonly Criterion[] = NUMERIC_CRITERIA.filter(
  (c) => c.group !== "overall",
);

/**
 * Derived overall impression: unweighted mean of the 12 input criteria, rounded (0-100).
 * Structurally typed over the 12 keys, so it accepts a DB row, a stats input, or a
 * numeric form-preview object alike. Returns a number; "no card" → null is a caller concern.
 */
export function computeOverall(
  values: { [K in InputCriterionKey]: number },
): number {
  let sum = 0;
  for (const c of INPUT_CRITERIA) sum += values[c.key as InputCriterionKey];
  return Math.round(sum / INPUT_CRITERIA.length);
}

/** Arrow + signed delta for change indicators (↑ +1 / ↓ -2 / →). Monochrome; Ch6 adds color. */
export function formatDelta(delta: number): string {
  if (delta > 0) return `↑ +${delta}`;
  if (delta < 0) return `↓ ${delta}`;
  return "→";
}

// Free-text fields (all four from the kata_scoring_cards data model).
export type TextFieldKey =
  | "kataSpecificNotes"
  | "priorityImprovements"
  | "strengths"
  | "coachNotes";

export const TEXT_FIELDS: readonly TextFieldKey[] = [
  "kataSpecificNotes",
  "priorityImprovements",
  "strengths",
  "coachNotes",
] as const;

// Compile-time guarantee the keys exist on the table's insert type. Only the 12 INPUT
// criteria are real columns; `overallImpression` is derived, so it is not asserted here.
type _ScoringInsert = typeof kataScoringCards.$inferInsert;
type _CheckNumeric = InputCriterionKey extends keyof _ScoringInsert
  ? true
  : never;
type _CheckText = TextFieldKey extends keyof _ScoringInsert ? true : never;
const _numericOk: _CheckNumeric = true;
const _textOk: _CheckText = true;
void _numericOk;
void _textOk;
