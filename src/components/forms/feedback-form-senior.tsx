"use client";

import { Input } from "@/components/ui/input";
import { useMessages } from "@/i18n/client";
import {
  Field,
  FeedbackFormShell,
  type KataTemplateProps,
  KataSelfRating,
  RatingField,
  Section,
  TextField,
} from "./feedback-fields";

export function FeedbackFormSenior({ repertoire, ...props }: KataTemplateProps) {
  const nl = useMessages();
  const f = nl.feedback;
  return (
    <FeedbackFormShell formType="SENIOR" {...props}>
      {(register, errors) => (
        <>
          <Section title={f.sideA}>
            <div className="grid gap-4 sm:grid-cols-2">
              <RatingField
                label={f.fields.selfRatingTraining}
                name="selfRatingTraining"
                register={register}
                error={errors.selfRatingTraining?.message}
              />
              <RatingField
                label={f.fields.selfRatingTrainingQuality}
                name="selfRatingTrainingQuality"
                register={register}
                error={errors.selfRatingTrainingQuality?.message}
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
                label={f.fields.selfRatingRecovery}
                name="selfRatingRecovery"
                register={register}
                error={errors.selfRatingRecovery?.message}
              />
              <RatingField
                label={f.fields.selfRatingMental}
                name="selfRatingMental"
                register={register}
                error={errors.selfRatingMental?.message}
              />
            </div>
            <TextField
              label={f.fields.trainingPeriodReflection}
              name="trainingPeriodReflection"
              register={register}
              rows={4}
            />
            <TextField
              label={f.fields.physicalStateNotes}
              name="physicalStateNotes"
              register={register}
              rows={3}
            />
            <TextField
              label={f.fields.competitionReflection}
              name="competitionReflection"
              register={register}
              rows={3}
            />
            <TextField
              label={f.fields.mentalPreparationReview}
              name="mentalPreparationReview"
              register={register}
              rows={3}
            />
            <TextField
              label={f.fields.athleteDiscussionPoints}
              name="athleteDiscussionPoints"
              register={register}
              rows={3}
            />
          </Section>

          <KataSelfRating repertoire={repertoire} register={register} />

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
