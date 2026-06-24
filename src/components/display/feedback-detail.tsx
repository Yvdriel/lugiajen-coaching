import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/i18n/format";
import { getLocale, getMessages } from "@/i18n/server";
import type {
  FeedbackActionRow,
  FeedbackGoalRow,
  FeedbackKataRatingRow,
  FeedbackRow,
} from "@/lib/queries/feedback";

/**
 * Pure presentational feedback detail (convention 3): the full form content for any
 * template (U12 / CADET / JUNIOR / SENIOR). Only fields with a value are shown, so
 * every Row is rendered unconditionally and empty ones drop out — that keeps the four
 * templates' overlapping field sets in one layout. Reused read-only by the coach
 * detail page and the public portal.
 */
export type FeedbackDetailProps = {
  form: FeedbackRow;
  kataRatings?: FeedbackKataRatingRow[];
  goals?: FeedbackGoalRow[];
  actions?: FeedbackActionRow[];
};

function Row({
  label,
  value,
}: {
  label: string;
  value: string | number | null;
}) {
  if (value === null || value === "") return null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="whitespace-pre-wrap text-sm">{value}</span>
    </div>
  );
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold">{title}</h3>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </section>
  );
}

export async function FeedbackDetail({
  form,
  kataRatings = [],
  goals = [],
  actions = [],
}: FeedbackDetailProps) {
  const nl = await getMessages();
  const locale = await getLocale();
  const f = nl.feedback;
  const ff = f.fields;
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

  // Group actions by kata for display; general (untagged) first, then per-kata.
  const generalActions = actions.filter((a) => !a.kataName);
  const kataGroups = new Map<string, FeedbackActionRow[]>();
  for (const a of actions) {
    if (!a.kataName) continue;
    const list = kataGroups.get(a.kataName) ?? [];
    list.push(a);
    kataGroups.set(a.kataName, list);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <Badge variant="outline">{form.formType}</Badge>
        <span>
          {f.meeting} {form.meetingNumber}
        </span>
        <span aria-hidden>·</span>
        <span>{formatDate(form.meetingDate, locale)}</span>
        <span aria-hidden>·</span>
        <span>{form.season}</span>
      </div>

      <Block title={f.sideA}>
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
      </Block>

      {kataRatings.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold">{f.kataSelfRating}</h3>
          <div className="flex flex-col gap-2">
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
          </div>
        </section>
      ) : null}

      <Block title={f.sideB}>
        <Row label={ff.previousGoalsReview} value={form.previousGoalsReview} />
        <Row label={ff.coachStrength} value={form.coachStrength} />
        <Row label={ff.coachDevelopmentArea} value={form.coachDevelopmentArea} />
        <Row
          label={ff.trainingStructureFeedback}
          value={form.trainingStructureFeedback}
        />
      </Block>

      <Block title={f.goals}>
        {goals.map((g) => (
          <div key={g.id} className="flex flex-col gap-0.5">
            <span className="flex flex-wrap items-center gap-2 text-xs font-medium text-muted-foreground">
              {goalLabel(g.category)}
              {g.status !== "active" ? (
                <Badge variant="outline">{f.goalStatus[g.status]}</Badge>
              ) : null}
            </span>
            <span className="whitespace-pre-wrap text-sm">{g.text}</span>
            {g.coachReason ? (
              <span className="text-xs text-muted-foreground italic">
                {g.coachReason}
              </span>
            ) : null}
          </div>
        ))}
        <Row label={ff.periodizationNotes} value={form.periodizationNotes} />
        <Row label={ff.physicalPlan} value={form.physicalPlan} />
      </Block>

      {actions.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold">{f.actionItems}</h3>
          <div className="flex flex-col gap-4">
            {generalActions.length > 0 ? (
              <ActionGroup title={f.actions.general} items={generalActions} nl={nl} />
            ) : null}
            {[...kataGroups.entries()].map(([kataName, items]) => (
              <ActionGroup key={kataName} title={kataName} items={items} nl={nl} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function ActionGroup({
  title,
  items,
  nl,
}: {
  title: string;
  items: FeedbackActionRow[];
  nl: Awaited<ReturnType<typeof getMessages>>;
}) {
  const f = nl.feedback;
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </span>
      {items.map((a) => (
        <div key={a.id} className="flex flex-col gap-0.5">
          <span className="flex flex-wrap items-center gap-2 text-sm">
            {a.text}
            {a.coachDisposition !== "pending" ? (
              <Badge variant="outline">{f.disposition[a.coachDisposition]}</Badge>
            ) : null}
            {a.carriedFromActionId ? (
              <Badge variant="outline">{f.goalStatus.carried}</Badge>
            ) : null}
          </span>
          {a.coachNote ? (
            <span className="text-xs text-muted-foreground">{a.coachNote}</span>
          ) : null}
          {a.athleteDisposition ? (
            <span className="text-xs text-muted-foreground italic">
              {f.review.athleteClaim}: {f.disposition[a.athleteDisposition]}
              {a.athleteReason ? ` — “${a.athleteReason}”` : ""}
            </span>
          ) : null}
        </div>
      ))}
    </div>
  );
}
