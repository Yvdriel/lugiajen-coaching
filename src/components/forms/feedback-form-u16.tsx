"use client";

import { Input } from "@/components/ui/input";
import { nl } from "@/messages/nl";
import {
  Field,
  type FeedbackTemplateProps,
  FeedbackFormShell,
  RatingField,
  Section,
  TextField,
} from "./feedback-fields";

export function FeedbackFormU16(props: FeedbackTemplateProps) {
  const f = nl.feedback;
  return (
    <FeedbackFormShell formType="U16" {...props}>
      {(register, errors) => (
        <>
          <Section title={f.sideA}>
            <TextField
              label={f.fields.athleteProudOf}
              name="athleteProudOf"
              register={register}
            />
            <TextField
              label={f.fields.athleteHardestThing}
              name="athleteHardestThing"
              register={register}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <RatingField
                label={f.fields.selfRatingTraining}
                name="selfRatingTraining"
                register={register}
                error={errors.selfRatingTraining?.message}
              />
              <RatingField
                label={f.fields.selfRatingMotivation}
                name="selfRatingMotivation"
                register={register}
                error={errors.selfRatingMotivation?.message}
              />
              <RatingField
                label={f.fields.selfRatingBody}
                name="selfRatingBody"
                register={register}
                error={errors.selfRatingBody?.message}
              />
              <RatingField
                label={f.fields.selfRatingCompetition}
                name="selfRatingCompetition"
                register={register}
                error={errors.selfRatingCompetition?.message}
              />
            </div>
            <TextField
              label={f.fields.athleteNeedsWork}
              name="athleteNeedsWork"
              register={register}
            />
            <TextField
              label={f.fields.athleteQuestion}
              name="athleteQuestion"
              register={register}
            />
          </Section>

          <Section title={f.goals}>
            <Field label={f.fields.goalMainProcess}>
              <Input {...register("goalMain")} />
            </Field>
            <Field label={f.fields.goalPerformance}>
              <Input {...register("goalPerformance")} />
            </Field>
            <Field label={f.fields.goalOutcome}>
              <Input {...register("goalOutcome")} />
            </Field>
            <Field label={f.fields.kataFocus}>
              <Input {...register("kataFocus")} />
            </Field>
          </Section>
        </>
      )}
    </FeedbackFormShell>
  );
}
