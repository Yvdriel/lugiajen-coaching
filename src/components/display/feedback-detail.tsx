import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import type { FeedbackRow } from "@/lib/queries/feedback";
import { nl } from "@/messages/nl";

/**
 * Pure presentational feedback detail (convention 3): the full form content, laid
 * out by `formType`. Only fields with a value are shown. Reused read-only by the
 * coach detail page and Ch10's public portal.
 */
export type FeedbackDetailProps = {
  form: FeedbackRow;
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

export function FeedbackDetail({ form }: FeedbackDetailProps) {
  const f = nl.feedback;
  const ff = f.fields;
  const isU12 = form.formType === "U12";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <Badge variant="outline">{form.formType}</Badge>
        <span>
          {f.meeting} {form.meetingNumber}
        </span>
        <span aria-hidden>·</span>
        <span>{new Date(form.meetingDate).toLocaleDateString("nl-NL")}</span>
        <span aria-hidden>·</span>
        <span>{form.season}</span>
      </div>

      <Block title={f.sideA}>
        <Row label={ff.athleteProudOf} value={form.athleteProudOf} />
        <Row label={ff.athleteHardestThing} value={form.athleteHardestThing} />
        {isU12 ? (
          <>
            <Row label={ff.athleteShowParents} value={form.athleteShowParents} />
            <Row label={ff.athleteFunScore} value={form.athleteFunScore} />
            <Row label={ff.athleteMakeMoreFun} value={form.athleteMakeMoreFun} />
          </>
        ) : (
          <>
            <Row label={ff.selfRatingTraining} value={form.selfRatingTraining} />
            <Row
              label={ff.selfRatingMotivation}
              value={form.selfRatingMotivation}
            />
            <Row label={ff.selfRatingBody} value={form.selfRatingBody} />
            <Row
              label={ff.selfRatingCompetition}
              value={form.selfRatingCompetition}
            />
            <Row label={ff.athleteNeedsWork} value={form.athleteNeedsWork} />
          </>
        )}
        <Row label={ff.athleteQuestion} value={form.athleteQuestion} />
      </Block>

      <Block title={f.sideB}>
        <Row label={ff.coachStrength} value={form.coachStrength} />
        <Row label={ff.coachDevelopmentArea} value={form.coachDevelopmentArea} />
      </Block>

      <Block title={f.goals}>
        <Row
          label={isU12 ? ff.goalMain : ff.goalMainProcess}
          value={form.goalMain}
        />
        {!isU12 ? (
          <>
            <Row label={ff.goalPerformance} value={form.goalPerformance} />
            <Row label={ff.goalOutcome} value={form.goalOutcome} />
            <Row label={ff.kataFocus} value={form.kataFocus} />
          </>
        ) : null}
      </Block>

      <Block title={f.actionItems}>
        <Row label={ff.action1} value={form.action1} />
        <Row label={ff.action2} value={form.action2} />
        <Row label={ff.action3} value={form.action3} />
      </Block>
    </div>
  );
}
