import type { Messages } from "@/messages";
import type { FeedbackRow } from "@/lib/queries/feedback";

// Pure shaping of a feedback form into ordered print sections — mirrors the
// U12-vs-U16 branching of `display/feedback-detail.tsx`. Empty fields and empty
// sections are dropped. Consumed by `feedback-document.tsx`; unit-tested.

export type PdfField = { label: string; value: string | number };
export type PdfSection = { title: string; fields: PdfField[] };

type RawField = { label: string; value: string | number | null | undefined };

function clean(fields: RawField[]): PdfField[] {
  return fields
    .filter((f) => f.value !== null && f.value !== undefined && f.value !== "")
    .map((f) => ({ label: f.label, value: f.value as string | number }));
}

export function feedbackSections(form: FeedbackRow, m: Messages): PdfSection[] {
  const ff = m.feedback.fields;
  const isU12 = form.formType === "U12";

  const sideA = clean([
    { label: ff.athleteProudOf, value: form.athleteProudOf },
    { label: ff.athleteHardestThing, value: form.athleteHardestThing },
    ...(isU12
      ? [
          { label: ff.athleteShowParents, value: form.athleteShowParents },
          { label: ff.athleteFunScore, value: form.athleteFunScore },
          { label: ff.athleteMakeMoreFun, value: form.athleteMakeMoreFun },
        ]
      : [
          { label: ff.selfRatingTraining, value: form.selfRatingTraining },
          { label: ff.selfRatingMotivation, value: form.selfRatingMotivation },
          { label: ff.selfRatingBody, value: form.selfRatingBody },
          {
            label: ff.selfRatingCompetition,
            value: form.selfRatingCompetition,
          },
          { label: ff.athleteNeedsWork, value: form.athleteNeedsWork },
        ]),
    { label: ff.athleteQuestion, value: form.athleteQuestion },
  ]);

  const sideB = clean([
    { label: ff.coachStrength, value: form.coachStrength },
    { label: ff.coachDevelopmentArea, value: form.coachDevelopmentArea },
  ]);

  const goals = clean([
    { label: isU12 ? ff.goalMain : ff.goalMainProcess, value: form.goalMain },
    ...(isU12
      ? []
      : [
          { label: ff.goalPerformance, value: form.goalPerformance },
          { label: ff.goalOutcome, value: form.goalOutcome },
          { label: ff.kataFocus, value: form.kataFocus },
        ]),
  ]);

  const actions = clean([
    { label: ff.action1, value: form.action1 },
    { label: ff.action2, value: form.action2 },
    { label: ff.action3, value: form.action3 },
  ]);

  return [
    { title: m.feedback.sideA, fields: sideA },
    { title: m.feedback.sideB, fields: sideB },
    { title: m.feedback.goals, fields: goals },
    { title: m.feedback.actionItems, fields: actions },
  ].filter((s) => s.fields.length > 0);
}
