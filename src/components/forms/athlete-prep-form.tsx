"use client";

import { useActionState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import type { FeedbackFormState } from "@/features/feedback/actions";
import type { FormType } from "@/features/feedback/form-type";
import { useMessages } from "@/i18n/client";
import {
  type FBValues,
  type KataRepertoireItem,
  Section,
  SideAFields,
} from "./feedback-fields";

/**
 * The athlete's public prepare form: only Side A + kata self-ratings, no header/coach
 * fields. Its own RHF + useActionState wiring (decoupled from the coach FeedbackFormShell).
 * The action is bound to the prepare token by the page.
 */
export function AthletePrepForm({
  formType,
  repertoire,
  defaultValues,
  action,
}: {
  formType: FormType;
  repertoire: KataRepertoireItem[];
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
