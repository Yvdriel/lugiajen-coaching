import { z } from "zod";
import type { CompetitionType } from "@/features/competitions/schema";
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
    // Action items are now a first-class table (feedback_action_items), parsed as a
    // dynamic list by features/feedback/children.ts — not fixed columns here.
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

// ── Competition reflection rows (athlete's read on a competition) ─────────────
// CADET+ prepare forms post a 1-5 rating, four structured fields (mirroring the
// coach's per-entry feedback), and free-text notes per windowed competition, named
// `cr_<field>_<competitionId>`.
export type CompetitionReflectionInput = {
  competitionId: string;
  overallRating: number | null;
  reflectionBefore: string | null;
  reflectionPerformance: string | null;
  reflectionImprovement: string | null;
  reflectionLesson: string | null;
  reflectionNotes: string | null;
};

/**
 * One competition as the athlete sees it during prep: meta + their own reflection
 * values, and NOTHING from the coach's per-entry feedback. Client-safe (no db) so the
 * prepare client form can import it; the mapper that builds it is the security boundary.
 */
export type CompetitionPrepItem = {
  competitionId: string;
  competitionName: string;
  competitionDate: string;
  competitionType: CompetitionType;
  categories: string[];
  reflection: {
    overallRating: number | null;
    before: string | null;
    performance: string | null;
    improvement: string | null;
    lesson: string | null;
    notes: string | null;
  };
};

export const crRatingField = (id: string) => `cr_rating_${id}`;
export const crBeforeField = (id: string) => `cr_before_${id}`;
export const crPerformanceField = (id: string) => `cr_performance_${id}`;
export const crImprovementField = (id: string) => `cr_improvement_${id}`;
export const crLessonField = (id: string) => `cr_lesson_${id}`;
export const crNotesField = (id: string) => `cr_notes_${id}`;

const reflectionRating = z.coerce
  .number()
  .int()
  .min(1, "Minimaal 1.")
  .max(5, "Maximaal 5.");

const textOrNull = (v: FormDataEntryValue | null): string | null =>
  typeof v === "string" && v.trim() !== "" ? v.trim() : null;

/**
 * Parse competition reflection rows from FormData, restricted to the server-derived
 * window ids (the public-submit boundary — a smuggled competition id is never in the
 * id list, so it can't be written). One row per windowed competition, even when the
 * athlete left it blank, so a presented competition doesn't reappear next meeting.
 */
export function parseCompetitionReflections(
  formData: FormData,
  competitionIds: readonly string[],
): CompetitionReflectionInput[] {
  return competitionIds.map((competitionId) => {
    const parsedRating = reflectionRating.safeParse(
      formData.get(crRatingField(competitionId)),
    );
    return {
      competitionId,
      overallRating: parsedRating.success ? parsedRating.data : null,
      reflectionBefore: textOrNull(formData.get(crBeforeField(competitionId))),
      reflectionPerformance: textOrNull(
        formData.get(crPerformanceField(competitionId)),
      ),
      reflectionImprovement: textOrNull(
        formData.get(crImprovementField(competitionId)),
      ),
      reflectionLesson: textOrNull(formData.get(crLessonField(competitionId))),
      reflectionNotes: textOrNull(formData.get(crNotesField(competitionId))),
    };
  });
}

// ── Goals + action items wire format (client-safe; no db) ─────────────────────
// Field-name helpers shared by the client forms and the server parsers
// (features/feedback/children.ts). Kept here so client components never import the
// db-bearing children module.
export type GoalCategory = "main" | "performance" | "outcome" | "kata_focus";
export type Disposition = "done" | "partly" | "not_done";

// Dynamic action list — contiguous indices 0..ai_count-1, re-indexed client-side.
export const ACTION_COUNT_FIELD = "ai_count";
export const actionTextField = (n: number) => `ai_text_${n}`;
export const actionKataField = (n: number) => `ai_kata_${n}`;

// The 4 template goal inputs → goal categories.
export const GOAL_FORM_FIELDS: ReadonlyArray<{
  name: string;
  category: GoalCategory;
}> = [
  { name: "goalMain", category: "main" },
  { name: "goalPerformance", category: "performance" },
  { name: "goalOutcome", category: "outcome" },
  { name: "kataFocus", category: "kata_focus" },
];

// Review panel (coach) — keyed per prior row id.
export const reviewGoalDispField = (id: string) => `rg_disp_${id}`;
export const reviewGoalMomentumField = (id: string) => `rg_momentum_${id}`;
export const reviewGoalReasonField = (id: string) => `rg_reason_${id}`;
export const reviewGoalCarryTextField = (id: string) => `rg_carrytext_${id}`;
export const reviewActionDispField = (id: string) => `ra_disp_${id}`;
export const reviewActionNoteField = (id: string) => `ra_note_${id}`;
export const reviewActionCarryField = (id: string) => `ra_carry_${id}`;

// Prepare flow (athlete self-disposition) — keyed per prior row id.
export const prepGoalDispField = (id: string) => `prep_goal_disp_${id}`;
export const prepGoalReasonField = (id: string) => `prep_goal_reason_${id}`;
export const prepActionDispField = (id: string) => `prep_action_disp_${id}`;
export const prepActionReasonField = (id: string) => `prep_action_reason_${id}`;
