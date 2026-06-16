"use client";

import { Input } from "@/components/ui/input";
import { useMessages } from "@/i18n/client";
import {
  Field,
  FeedbackFormShell,
  type KataTemplateProps,
  Section,
  SideASection,
  TextField,
} from "./feedback-fields";

export function FeedbackFormSenior({
  repertoire,
  lockSideA,
  ...props
}: KataTemplateProps) {
  const nl = useMessages();
  const f = nl.feedback;
  return (
    <FeedbackFormShell formType="SENIOR" {...props}>
      {(register, errors) => (
        <>
          <SideASection
            formType="SENIOR"
            register={register}
            errors={errors}
            repertoire={repertoire}
            lock={lockSideA}
          />

          <Section title={f.sideB}>
            <TextField
              label={f.fields.previousGoalsReview}
              name="previousGoalsReview"
              register={register}
              rows={3}
            />
            <TextField
              label={f.fields.coachStrength}
              name="coachStrength"
              register={register}
            />
            <TextField
              label={f.fields.coachDevelopmentArea}
              name="coachDevelopmentArea"
              register={register}
            />
            <TextField
              label={f.fields.trainingStructureFeedback}
              name="trainingStructureFeedback"
              register={register}
              rows={3}
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
            <TextField
              label={f.fields.periodizationNotes}
              name="periodizationNotes"
              register={register}
              rows={3}
            />
            <TextField
              label={f.fields.physicalPlan}
              name="physicalPlan"
              register={register}
            />
          </Section>
        </>
      )}
    </FeedbackFormShell>
  );
}
