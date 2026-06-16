import { z } from "zod";
import { maxMeetingNumber } from "./form-type";

// Server-authoritative validation (convention 8). One schema covers all templates:
// header fields required, all content fields optional (nullable + live-fillable). Each
// template posts only its own fields; the action nulls whatever is absent.
const emptyToUndef = (v: unknown) => (v === "" || v == null ? undefined : v);
const optText = z.preprocess(emptyToUndef, z.string().optional());
const rating = z.preprocess(
  emptyToUndef,
  z.coerce.number().int().min(1, "Minimaal 1.").max(5, "Maximaal 5.").optional(),
);

// The raw object (no cross-field refine) so subsets can `.pick()` from it. The
// public athlete-prep schema picks only Side A; `feedbackSchema` re-wraps the refine.
export const feedbackBaseSchema = z.object({
    formType: z.enum(["U12", "CADET", "JUNIOR", "SENIOR"], {
      message: "Onbekend sjabloon.",
    }),
    meetingNumber: z.preprocess(
      emptyToUndef,
      z.coerce.number().int().min(1, "Minimaal 1.").default(1),
    ),
    meetingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Datum is verplicht."),
    season: z.string().trim().min(1, "Seizoen is verplicht."),
    // Side A — athlete self-assessment
    athleteProudOf: optText,
    athleteHardestThing: optText,
    athleteShowParents: optText, // U12
    athleteFunScore: rating, // U12
    athleteMakeMoreFun: optText, // U12
    athleteQuestion: optText,
    // CADET+ self-ratings
    selfRatingTraining: rating, // CADET+
    selfRatingMotivation: rating, // CADET+
    selfRatingBody: rating, // CADET+
    selfRatingCompetition: rating, // CADET+
    athleteNeedsWork: optText, // CADET
    // SENIOR-only extra self-ratings
    selfRatingTrainingQuality: rating, // SENIOR
    selfRatingRecovery: rating, // SENIOR
    selfRatingMental: rating, // SENIOR
    // JUNIOR + SENIOR reflections
    trainingQualityReflection: optText, // JUNIOR+SENIOR
    competitionReflection: optText, // JUNIOR+SENIOR
    mentalPreparation: optText, // JUNIOR
    mentalPreparationReview: optText, // SENIOR
    trainingPeriodReflection: optText, // SENIOR
    physicalStateNotes: optText, // SENIOR
    athleteDiscussionPoints: optText, // SENIOR
    // Side B — coach
    coachStrength: optText,
    coachDevelopmentArea: optText,
    trainingStructureFeedback: optText, // JUNIOR+SENIOR
    previousGoalsReview: optText, // SENIOR
    // goals
    goalMain: optText,
    goalPerformance: optText, // CADET+
    goalOutcome: optText, // CADET+
    kataFocus: optText, // CADET+
    periodizationNotes: optText, // JUNIOR+SENIOR
    physicalPlan: optText, // SENIOR
    // action items
    action1: optText,
    action2: optText,
    action3: optText,
    action4: optText, // SENIOR
});

export const feedbackSchema = feedbackBaseSchema.superRefine((d, ctx) => {
  const max = maxMeetingNumber(d.formType);
  if (d.meetingNumber > max) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["meetingNumber"],
      message: `Maximaal ${max}.`,
    });
  }
});

export type FeedbackParsed = z.infer<typeof feedbackSchema>;

// All content fields (union) — drives FormData parsing + UPDATE nulling.
export const FEEDBACK_CONTENT_FIELDS = [
  "athleteProudOf",
  "athleteHardestThing",
  "athleteShowParents",
  "athleteFunScore",
  "athleteMakeMoreFun",
  "athleteQuestion",
  "selfRatingTraining",
  "selfRatingMotivation",
  "selfRatingBody",
  "selfRatingCompetition",
  "athleteNeedsWork",
  "selfRatingTrainingQuality",
  "selfRatingRecovery",
  "selfRatingMental",
  "trainingQualityReflection",
  "competitionReflection",
  "mentalPreparation",
  "mentalPreparationReview",
  "trainingPeriodReflection",
  "physicalStateNotes",
  "athleteDiscussionPoints",
  "coachStrength",
  "coachDevelopmentArea",
  "trainingStructureFeedback",
  "previousGoalsReview",
  "goalMain",
  "goalPerformance",
  "goalOutcome",
  "kataFocus",
  "periodizationNotes",
  "physicalPlan",
  "action1",
  "action2",
  "action3",
  "action4",
] as const;

// ── Side A / Side B partition (the public-prepare security boundary) ──────────
// Coach-owned content — NEVER writable by the public athlete-prepare action.
export const FEEDBACK_COACH_FIELDS = [
  "coachStrength",
  "coachDevelopmentArea",
  "trainingStructureFeedback",
  "previousGoalsReview",
  "goalMain",
  "goalPerformance",
  "goalOutcome",
  "kataFocus",
  "periodizationNotes",
  "physicalPlan",
  "action1",
  "action2",
  "action3",
  "action4",
] as const;

const COACH_SET: ReadonlySet<string> = new Set(FEEDBACK_COACH_FIELDS);

// Side A (athlete self-assessment) = the content union minus coach fields. Derived
// (not hand-listed) so a new content field can't silently become athlete-writable.
export const FEEDBACK_ATHLETE_FIELDS = FEEDBACK_CONTENT_FIELDS.filter(
  (k) => !COACH_SET.has(k),
);

// Public submit schema: only `formType` + Side A fields can be parsed. Even if a
// coach field is smuggled into the FormData, it isn't in this schema's shape.
export const athletePrepSchema = feedbackBaseSchema.pick(
  Object.fromEntries([
    ["formType", true],
    ...FEEDBACK_ATHLETE_FIELDS.map((k) => [k, true]),
  ]) as { formType: true } & Record<
    (typeof FEEDBACK_ATHLETE_FIELDS)[number],
    true
  >,
);

export type AthletePrepParsed = z.infer<typeof athletePrepSchema>;

// Field keys posted per template (documentation; the server reads the full union
// above and nulls whatever a template omits).
export const U12_FIELDS = [
  "athleteProudOf",
  "athleteHardestThing",
  "athleteShowParents",
  "athleteFunScore",
  "athleteMakeMoreFun",
  "athleteQuestion",
  "coachStrength",
  "coachDevelopmentArea",
  "goalMain",
  "action1",
  "action2",
  "action3",
] as const;

export const CADET_FIELDS = [
  "athleteProudOf",
  "athleteHardestThing",
  "athleteQuestion",
  "selfRatingTraining",
  "selfRatingMotivation",
  "selfRatingBody",
  "selfRatingCompetition",
  "athleteNeedsWork",
  "coachStrength",
  "coachDevelopmentArea",
  "goalMain",
  "goalPerformance",
  "goalOutcome",
  "kataFocus",
  "action1",
  "action2",
  "action3",
] as const;

export const JUNIOR_FIELDS = [
  "selfRatingTraining",
  "selfRatingMotivation",
  "selfRatingBody",
  "selfRatingCompetition",
  "trainingQualityReflection",
  "competitionReflection",
  "mentalPreparation",
  "athleteQuestion",
  "coachStrength",
  "coachDevelopmentArea",
  "trainingStructureFeedback",
  "goalMain",
  "goalPerformance",
  "goalOutcome",
  "kataFocus",
  "periodizationNotes",
  "action1",
  "action2",
  "action3",
] as const;

export const SENIOR_FIELDS = [
  "selfRatingTraining",
  "selfRatingTrainingQuality",
  "selfRatingMotivation",
  "selfRatingBody",
  "selfRatingRecovery",
  "selfRatingMental",
  "trainingPeriodReflection",
  "physicalStateNotes",
  "competitionReflection",
  "mentalPreparationReview",
  "athleteDiscussionPoints",
  "previousGoalsReview",
  "coachStrength",
  "coachDevelopmentArea",
  "trainingStructureFeedback",
  "goalMain",
  "goalPerformance",
  "goalOutcome",
  "kataFocus",
  "periodizationNotes",
  "physicalPlan",
  "action1",
  "action2",
  "action3",
  "action4",
] as const;

// ── Kata self-rating rows ─────────────────────────────────────────────────────
// CADET/JUNIOR/SENIOR forms post a score (1-10) + notes per kata in the athlete's
// repertoire, named `kr_score_<kataId>` / `kr_notes_<kataId>`.
export type KataRatingInput = {
  kataId: string;
  score: number | null;
  notes: string | null;
};

export const KATA_RATING_FIELD_PREFIX = "kr_";
export const kataScoreField = (kataId: string) => `kr_score_${kataId}`;
export const kataNotesField = (kataId: string) => `kr_notes_${kataId}`;

const kataScore = z.coerce
  .number()
  .int()
  .min(1, "Minimaal 1.")
  .max(10, "Maximaal 10.");

/**
 * Parse kata self-rating rows from FormData for the given kata ids. Drops a row
 * when both score and notes are empty; clamps/validates score to 1-10 (invalid →
 * null so a stray value never blocks the save).
 */
export function parseKataRatings(
  formData: FormData,
  kataIds: readonly string[],
): KataRatingInput[] {
  const out: KataRatingInput[] = [];
  for (const kataId of kataIds) {
    const rawScore = formData.get(kataScoreField(kataId));
    const rawNotes = formData.get(kataNotesField(kataId));
    const notes =
      typeof rawNotes === "string" && rawNotes.trim() !== ""
        ? rawNotes.trim()
        : null;
    const parsedScore = kataScore.safeParse(rawScore);
    const score = parsedScore.success ? parsedScore.data : null;
    if (score === null && notes === null) continue;
    out.push({ kataId, score, notes });
  }
  return out;
}
