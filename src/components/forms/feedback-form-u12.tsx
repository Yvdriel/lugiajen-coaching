"use client";

import { Input } from "@/components/ui/input";
import { useMessages } from "@/i18n/client";
import {
  CoachSection,
  Field,
  type FeedbackTemplateProps,
  FeedbackFormShell,
  Section,
  SideASection,
} from "./feedback-fields";

export function FeedbackFormU12({ lockSideA, ...props }: FeedbackTemplateProps) {
  const nl = useMessages();
  const f = nl.feedback;
  return (
    <FeedbackFormShell formType="U12" {...props}>
      {(register, errors) => (
        <>
          <SideASection
            formType="U12"
            register={register}
            errors={errors}
            lock={lockSideA}
          />

          <CoachSection register={register} />

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
