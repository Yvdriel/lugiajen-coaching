"use client";

import { Input } from "@/components/ui/input";
import { useMessages } from "@/i18n/client";
import {
  CoachSection,
  Field,
  FeedbackFormShell,
  type KataTemplateProps,
  Section,
  SideASection,
} from "./feedback-fields";

export function FeedbackFormCadet({
  repertoire,
  lockSideA,
  ...props
}: KataTemplateProps) {
  const nl = useMessages();
  const f = nl.feedback;
  return (
    <FeedbackFormShell formType="CADET" {...props}>
      {(register, errors) => (
        <>
          <SideASection
            formType="CADET"
            register={register}
            errors={errors}
            repertoire={repertoire}
            lock={lockSideA}
          />

          <CoachSection register={register} />

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
