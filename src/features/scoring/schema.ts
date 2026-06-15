import { z } from "zod";

// Server-authoritative validation (convention 8). Numeric criteria map 1:1 to the
// kata_scoring_cards integer columns; text fields are optional. Keys are kept in sync
// with criteria.ts (which compile-checks them against the table's insert type).

const score = z.coerce
  .number({ message: "Vereist (1-10)." })
  .int("Geheel getal.")
  .min(1, "Minimaal 1.")
  .max(10, "Maximaal 10.");

const emptyToUndef = (v: unknown) => (v === "" || v == null ? undefined : v);
const optText = z.preprocess(emptyToUndef, z.string().optional());

export const scoringCardSchema = z.object({
  assessmentDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Beoordelingsdatum is verplicht."),
  // technical
  stances: score,
  techniques: score,
  transitions: score,
  timing: score,
  breathing: score,
  kiai: score,
  kime: score,
  conformance: score,
  // athletic
  strength: score,
  speed: score,
  balance: score,
  rhythm: score,
  // overall
  overallImpression: score,
  // free text
  kataSpecificNotes: optText,
  priorityImprovements: optText,
  strengths: optText,
  coachNotes: optText,
});

export type ScoringCardParsed = z.infer<typeof scoringCardSchema>;
