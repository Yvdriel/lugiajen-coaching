import { z } from "zod";

// Server-authoritative validation (convention 8). Two schemas: the competition
// itself, and a per-athlete entry. Entry content fields are all optional/nullable
// (live-fillable, "feedback can be done later"); category is the only required entry field.
const emptyToUndef = (v: unknown) => (v === "" || v == null ? undefined : v);
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const optText = z.preprocess(emptyToUndef, z.string().optional());
const optUuid = z.preprocess(
  emptyToUndef,
  z.string().regex(UUID_RE, "Ongeldige kata.").optional(),
);
const optResult = z.preprocess(emptyToUndef, z.enum(["win", "loss"]).optional());
const optPlacement = z.preprocess(
  emptyToUndef,
  z.coerce.number().int().min(1, "Minimaal 1.").max(99, "Maximaal 99.").optional(),
);

export const COMPETITION_TYPES = [
  "club",
  "regional",
  "national",
  "international",
] as const;
export type CompetitionType = (typeof COMPETITION_TYPES)[number];

export const competitionSchema = z.object({
  name: z.string().trim().min(1, "Naam is verplicht."),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Datum is verplicht."),
  competitionType: z.enum(
    ["club", "regional", "national", "international"],
    { message: "Kies een type." },
  ),
  location: optText,
  notes: optText,
});
export type CompetitionParsed = z.infer<typeof competitionSchema>;

// The five competition rounds: a kata column + its win/loss result column, with a
// label key into nl.competition.rounds. Drives the entry form, parse, and display.
export const ENTRY_ROUNDS = [
  { kata: "kataRound1", result: "kataRound1Result", labelKey: "round1" },
  { kata: "kataRound2", result: "kataRound2Result", labelKey: "round2" },
  { kata: "kataRound3", result: "kataRound3Result", labelKey: "round3" },
  { kata: "kataRound4", result: "kataRound4Result", labelKey: "round4" },
  { kata: "kataFinal", result: "kataFinalResult", labelKey: "final" },
] as const;

export const competitionEntrySchema = z.object({
  category: z.string().trim().min(1, "Categorie is verplicht."),
  resultPlacement: optPlacement,
  resultRoundReached: optText,
  kataRound1: optUuid,
  kataRound1Result: optResult,
  kataRound2: optUuid,
  kataRound2Result: optResult,
  kataRound3: optUuid,
  kataRound3Result: optResult,
  kataRound4: optUuid,
  kataRound4Result: optResult,
  kataFinal: optUuid,
  kataFinalResult: optResult,
  feedbackBefore: optText,
  feedbackPerformance: optText,
  feedbackImprovement: optText,
  feedbackLesson: optText,
  coachNotes: optText,
});
export type CompetitionEntryParsed = z.infer<typeof competitionEntrySchema>;

// Nullable entry content fields (everything except the required `category`). Drives
// FormData parsing + UPDATE nulling so an edit clears fields the form left empty.
export const ENTRY_CONTENT_FIELDS = [
  "resultPlacement",
  "resultRoundReached",
  "kataRound1",
  "kataRound1Result",
  "kataRound2",
  "kataRound2Result",
  "kataRound3",
  "kataRound3Result",
  "kataRound4",
  "kataRound4Result",
  "kataFinal",
  "kataFinalResult",
  "feedbackBefore",
  "feedbackPerformance",
  "feedbackImprovement",
  "feedbackLesson",
  "coachNotes",
] as const;
