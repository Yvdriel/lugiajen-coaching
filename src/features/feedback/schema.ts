import { z } from "zod";

// Server-authoritative validation (convention 8). One schema covers both templates:
// header fields required, all content fields optional (nullable + live-fillable). Each
// template posts only its own fields; the action nulls whatever is absent.
const emptyToUndef = (v: unknown) => (v === "" || v == null ? undefined : v);
const optText = z.preprocess(emptyToUndef, z.string().optional());
const rating = z.preprocess(
  emptyToUndef,
  z.coerce.number().int().min(1, "Minimaal 1.").max(5, "Maximaal 5.").optional(),
);

export const feedbackSchema = z.object({
  formType: z.enum(["U12", "U16"], { message: "Onbekend sjabloon." }),
  meetingNumber: z.preprocess(
    emptyToUndef,
    z.coerce.number().int().min(1, "Minimaal 1.").max(3, "Maximaal 3.").default(1),
  ),
  meetingDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Datum is verplicht."),
  season: z.string().trim().min(1, "Seizoen is verplicht."),
  // Side A — athlete self-assessment
  athleteProudOf: optText,
  athleteHardestThing: optText,
  athleteShowParents: optText, // U12
  athleteFunScore: rating, // U12
  athleteMakeMoreFun: optText, // U12
  athleteQuestion: optText,
  selfRatingTraining: rating, // U16
  selfRatingMotivation: rating, // U16
  selfRatingBody: rating, // U16
  selfRatingCompetition: rating, // U16
  athleteNeedsWork: optText, // U16
  // Side B — coach
  coachStrength: optText,
  coachDevelopmentArea: optText,
  // goals
  goalMain: optText,
  goalPerformance: optText, // U16
  goalOutcome: optText, // U16
  kataFocus: optText, // U16
  // action items
  action1: optText,
  action2: optText,
  action3: optText,
});

export type FeedbackParsed = z.infer<typeof feedbackSchema>;

// Field keys posted per template (drives FormData parsing + UPDATE nulling).
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

export const U16_FIELDS = [
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
