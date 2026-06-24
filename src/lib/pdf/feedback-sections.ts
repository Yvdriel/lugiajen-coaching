import type { Messages } from "@/messages";
import type { MeetingCompetition } from "@/lib/queries/competition-reflections";
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

/**
 * Competition section (CADET+): one PdfSection per competition, the athlete's
 * reflection paired with the coach's per-entry feedback (one coach line per category).
 * Empty for U12 / the fill-in-person path that passes no competitions.
 */
function competitionSections(
  competitions: MeetingCompetition[],
  m: Messages,
): PdfSection[] {
  const cs = m.feedback.competitionSection;
  const e = m.competition.entry;
  const dims = [
    { coach: "feedbackBefore", refl: "reflectionBefore", label: e.feedbackBefore },
    {
      coach: "feedbackPerformance",
      refl: "reflectionPerformance",
      label: e.feedbackPerformance,
    },
    {
      coach: "feedbackImprovement",
      refl: "reflectionImprovement",
      label: e.feedbackImprovement,
    },
    { coach: "feedbackLesson", refl: "reflectionLesson", label: e.feedbackLesson },
  ] as const;

  return competitions
    .map((c) => {
      const r = c.reflection as Record<string, unknown> | null;
      const fields: RawField[] = [];
      if (c.reflection?.overallRating != null) {
        fields.push({ label: cs.rating, value: `${c.reflection.overallRating}/5` });
      }
      for (const d of dims) {
        const athleteVal = (r?.[d.refl] as string | null) ?? null;
        const coachLines = c.entries
          .map((entry) => {
            const v = (entry as Record<string, unknown>)[d.coach] as
              | string
              | null;
            if (!v) return null;
            const tag = c.entries.length > 1 ? ` (${entry.category})` : "";
            return `${cs.coachColumn}${tag}: ${v}`;
          })
          .filter((x): x is string => x !== null);
        if (!athleteVal && coachLines.length === 0) continue;
        const parts = [
          athleteVal ? `${cs.athleteColumn}: ${athleteVal}` : null,
          ...coachLines,
        ].filter((x): x is string => x !== null);
        fields.push({ label: d.label, value: parts.join("\n") });
      }
      if (c.reflection?.reflectionNotes) {
        fields.push({
          label: cs.notes,
          value: `${cs.athleteColumn}: ${c.reflection.reflectionNotes}`,
        });
      }
      return {
        title: `${cs.heading} — ${c.competitionName}`,
        fields: clean(fields),
      };
    })
    .filter((s) => s.fields.length > 0);
}

export function feedbackSections(
  form: FeedbackRow,
  m: Messages,
  kataRatings: FeedbackKataRatingRow[] = [],
  goalRows: FeedbackGoalRow[] = [],
  actionRows: FeedbackActionRow[] = [],
  competitions: MeetingCompetition[] = [],
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
    ...competitionSections(competitions, m),
  ].filter((s) => s.fields.length > 0);
}
