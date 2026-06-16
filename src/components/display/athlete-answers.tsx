import { getMessages } from "@/i18n/server";
import type {
  FeedbackKataRatingRow,
  FeedbackRow,
} from "@/lib/queries/feedback";

/**
 * Read-only Side A (athlete self-assessment) + kata self-ratings — the athlete's own
 * answers, with no coach/goals/actions headings. Reused by the public prepare page
 * (after submit) and the portal's prepared-form card. Empty fields drop out.
 */
function Row({ label, value }: { label: string; value: string | number | null }) {
  if (value === null || value === "") return null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="whitespace-pre-wrap text-sm">{value}</span>
    </div>
  );
}

export async function AthleteAnswers({
  form,
  kataRatings = [],
}: {
  form: FeedbackRow;
  kataRatings?: FeedbackKataRatingRow[];
}) {
  const nl = await getMessages();
  const ff = nl.feedback.fields;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-3 sm:grid-cols-2">
        <Row label={ff.athleteProudOf} value={form.athleteProudOf} />
        <Row label={ff.athleteHardestThing} value={form.athleteHardestThing} />
        <Row label={ff.athleteShowParents} value={form.athleteShowParents} />
        <Row label={ff.athleteFunScore} value={form.athleteFunScore} />
        <Row label={ff.athleteMakeMoreFun} value={form.athleteMakeMoreFun} />
        <Row label={ff.selfRatingTraining} value={form.selfRatingTraining} />
        <Row
          label={ff.selfRatingTrainingQuality}
          value={form.selfRatingTrainingQuality}
        />
        <Row label={ff.selfRatingMotivation} value={form.selfRatingMotivation} />
        <Row label={ff.selfRatingBody} value={form.selfRatingBody} />
        <Row label={ff.selfRatingRecovery} value={form.selfRatingRecovery} />
        <Row
          label={ff.selfRatingCompetition}
          value={form.selfRatingCompetition}
        />
        <Row label={ff.selfRatingMental} value={form.selfRatingMental} />
        <Row label={ff.athleteNeedsWork} value={form.athleteNeedsWork} />
        <Row
          label={ff.trainingQualityReflection}
          value={form.trainingQualityReflection}
        />
        <Row
          label={ff.trainingPeriodReflection}
          value={form.trainingPeriodReflection}
        />
        <Row label={ff.physicalStateNotes} value={form.physicalStateNotes} />
        <Row
          label={ff.competitionReflection}
          value={form.competitionReflection}
        />
        <Row label={ff.mentalPreparation} value={form.mentalPreparation} />
        <Row
          label={ff.mentalPreparationReview}
          value={form.mentalPreparationReview}
        />
        <Row label={ff.athleteQuestion} value={form.athleteQuestion} />
        <Row
          label={ff.athleteDiscussionPoints}
          value={form.athleteDiscussionPoints}
        />
      </div>

      {kataRatings.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold">{nl.feedback.kataSelfRating}</h3>
          {kataRatings.map((k) => (
            <div key={k.kataId} className="flex flex-col gap-0.5">
              <span className="text-xs font-medium text-muted-foreground">
                {k.kataName}
                {k.score != null ? ` — ${k.score}/10` : ""}
              </span>
              {k.notes ? (
                <span className="whitespace-pre-wrap text-sm">{k.notes}</span>
              ) : null}
            </div>
          ))}
        </section>
      ) : null}
    </div>
  );
}
