import type { Messages } from "@/messages";
import type {
  FeedbackActionRow,
  FeedbackGoalRow,
  FeedbackKataRatingRow,
  FeedbackRow,
} from "@/lib/queries/feedback";

// Pure shaping of a feedback form into ordered print sections — mirrors
// `display/feedback-detail.tsx`. Every possible field is listed; `clean` drops the
// empty ones, so one layout covers all four templates (U12 / CADET / JUNIOR /
// SENIOR). Consumed by `feedback-document.tsx`; unit-tested.

export type PdfField = { label: string; value: string | number };
export type PdfSection = { title: string; fields: PdfField[] };

type RawField = { label: string; value: string | number | null | undefined };

function clean(fields: RawField[]): PdfField[] {
  return fields
    .filter((f) => f.value !== null && f.value !== undefined && f.value !== "")
    .map((f) => ({ label: f.label, value: f.value as string | number }));
}

export function feedbackSections(
  form: FeedbackRow,
  m: Messages,
  kataRatings: FeedbackKataRatingRow[] = [],
  goalRows: FeedbackGoalRow[] = [],
  actionRows: FeedbackActionRow[] = [],
): PdfSection[] {
  const fm = m.feedback;
  const ff = fm.fields;
  const isU12 = form.formType === "U12";
  const goalLabel = (cat: FeedbackGoalRow["category"]): string =>
    cat === "main"
      ? isU12
        ? ff.goalMain
        : ff.goalMainProcess
      : cat === "performance"
        ? ff.goalPerformance
        : cat === "outcome"
          ? ff.goalOutcome
          : ff.kataFocus;

  const sideA = clean([
    { label: ff.athleteProudOf, value: form.athleteProudOf },
    { label: ff.athleteHardestThing, value: form.athleteHardestThing },
    { label: ff.athleteShowParents, value: form.athleteShowParents },
    { label: ff.athleteFunScore, value: form.athleteFunScore },
    { label: ff.athleteMakeMoreFun, value: form.athleteMakeMoreFun },
    { label: ff.selfRatingTraining, value: form.selfRatingTraining },
    {
      label: ff.selfRatingTrainingQuality,
      value: form.selfRatingTrainingQuality,
    },
    { label: ff.selfRatingMotivation, value: form.selfRatingMotivation },
    { label: ff.selfRatingBody, value: form.selfRatingBody },
    { label: ff.selfRatingRecovery, value: form.selfRatingRecovery },
    { label: ff.selfRatingCompetition, value: form.selfRatingCompetition },
    { label: ff.selfRatingMental, value: form.selfRatingMental },
    { label: ff.athleteNeedsWork, value: form.athleteNeedsWork },
    {
      label: ff.trainingQualityReflection,
      value: form.trainingQualityReflection,
    },
    {
      label: ff.trainingPeriodReflection,
      value: form.trainingPeriodReflection,
    },
    { label: ff.physicalStateNotes, value: form.physicalStateNotes },
    { label: ff.competitionReflection, value: form.competitionReflection },
    { label: ff.mentalPreparation, value: form.mentalPreparation },
    {
      label: ff.mentalPreparationReview,
      value: form.mentalPreparationReview,
    },
    { label: ff.athleteQuestion, value: form.athleteQuestion },
    { label: ff.athleteDiscussionPoints, value: form.athleteDiscussionPoints },
  ]);

  const kata = clean(
    kataRatings.map((k) => ({
      label: k.kataName,
      value:
        (k.score != null ? `${k.score}/10` : "") +
        (k.notes ? (k.score != null ? " — " : "") + k.notes : ""),
    })),
  );

  const sideB = clean([
    { label: ff.previousGoalsReview, value: form.previousGoalsReview },
    { label: ff.coachStrength, value: form.coachStrength },
    { label: ff.coachDevelopmentArea, value: form.coachDevelopmentArea },
    {
      label: ff.trainingStructureFeedback,
      value: form.trainingStructureFeedback,
    },
  ]);

  const goals = clean([
    ...goalRows.map((g) => ({
      label: goalLabel(g.category),
      value:
        g.status !== "active" ? `${g.text} (${fm.goalStatus[g.status]})` : g.text,
    })),
    { label: ff.periodizationNotes, value: form.periodizationNotes },
    { label: ff.physicalPlan, value: form.physicalPlan },
  ]);

  const actions = clean(
    actionRows.map((a) => ({
      label: a.kataName ?? fm.actions.general,
      value:
        a.text +
        (a.coachDisposition !== "pending"
          ? ` (${fm.disposition[a.coachDisposition]})`
          : "") +
        (a.carriedFromActionId ? ` [${fm.goalStatus.carried}]` : ""),
    })),
  );

  return [
    { title: m.feedback.sideA, fields: sideA },
    { title: m.feedback.kataSelfRating, fields: kata },
    { title: m.feedback.sideB, fields: sideB },
    { title: m.feedback.goals, fields: goals },
    { title: m.feedback.actionItems, fields: actions },
  ].filter((s) => s.fields.length > 0);
}
