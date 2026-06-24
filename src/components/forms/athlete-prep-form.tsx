"use client";

import { useActionState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import type { FeedbackFormState } from "@/features/feedback/actions";
import type { FormType } from "@/features/feedback/form-type";
import { useMessages } from "@/i18n/client";
import {
  AthleteReviewPanel,
  type FBValues,
  type FeedbackReview,
  type KataRepertoireItem,
  Section,
  SideAFields,
} from "./feedback-fields";

/**
 * The athlete's public prepare form: a self-disposition review of the previous
 * meeting's open items, then Side A + kata self-ratings. No header/coach fields. Its
 * own RHF + useActionState wiring. The action is bound to the prepare token by the page.
 */
export function AthletePrepForm({
  formType,
  repertoire,
  review,
  defaultValues,
  action,
}: {
  formType: FormType;
  repertoire: KataRepertoireItem[];
  review: FeedbackReview;
  defaultValues: FBValues;
  action: (
    prev: FeedbackFormState,
    formData: FormData,
  ) => Promise<FeedbackFormState>;
}) {
  const nl = useMessages();
  const [state, formAction, pending] = useActionState<
    FeedbackFormState,
    FormData
  >(action, { ok: false });
  const {
    register,
    setError,
    formState: { errors },
  } = useForm<FBValues>({ mode: "onBlur", defaultValues });

  useEffect(() => {
    if (!state.fieldErrors) return;
    for (const [key, message] of Object.entries(state.fieldErrors)) {
      setError(key, { message });
    }
  }, [state, setError]);

  return (
    <form action={formAction} className="flex flex-col gap-6" noValidate>
      <input type="hidden" name="formType" value={formType} />
      <AthleteReviewPanel review={review} fieldErrors={state.fieldErrors} />
      <Section title={nl.feedback.sideA}>
        <SideAFields
          formType={formType}
          register={register}
          errors={errors}
          repertoire={repertoire}
        />
      </Section>

      {state.message ? (
        <p className="text-sm text-destructive">{state.message}</p>
      ) : null}

      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? nl.common.loading : nl.prepare.submit}
      </Button>
    </form>
  );
}
