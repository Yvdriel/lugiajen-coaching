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

export function FeedbackFormU12(props: FeedbackTemplateProps) {
  const f = nl.feedback;
  return (
    <FeedbackFormShell formType="U12" {...props}>
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
            <TextField
              label={f.fields.athleteShowParents}
              name="athleteShowParents"
              register={register}
            />
            <RatingField
              label={f.fields.athleteFunScore}
              name="athleteFunScore"
              register={register}
              error={errors.athleteFunScore?.message}
            />
            <TextField
              label={f.fields.athleteMakeMoreFun}
              name="athleteMakeMoreFun"
              register={register}
            />
            <TextField
              label={f.fields.athleteQuestion}
              name="athleteQuestion"
              register={register}
            />
          </Section>

          <Section title={f.goals}>
            <Field label={f.fields.goalMain}>
              <Input {...register("goalMain")} />
            </Field>
          </Section>
        </>
      )}
    </FeedbackFormShell>
  );
}
