"use client";

import Link from "next/link";
import type { Route } from "next";
import { useActionState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  createFeedbackDraft,
  type FeedbackFormState,
} from "@/features/feedback/actions";
import type { FormType } from "@/features/feedback/form-type";
import { useMessages } from "@/i18n/client";

/**
 * The "Laat de atleet zich voorbereiden?" step. "Nee" goes to the in-person form;
 * "Ja" creates an athlete-prepare draft (server action redirects to the detail page
 * where the copy-link lives).
 */
export function PrepareChoice({
  athleteId,
  formType,
  inPersonHref,
}: {
  athleteId: string;
  formType: FormType;
  inPersonHref: Route;
}) {
  const nl = useMessages();
  const f = nl.feedback;
  const [state, formAction, pending] = useActionState<
    FeedbackFormState,
    FormData
  >(createFeedbackDraft, { ok: false });

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border p-5">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold">{f.letPrepare}</p>
        <p className="text-sm text-muted-foreground">{f.letPrepareHint}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href={inPersonHref} className={buttonVariants({ variant: "outline" })}>
          {f.prepareNo}
        </Link>

        <form action={formAction}>
          <input type="hidden" name="athleteId" value={athleteId} />
          <input type="hidden" name="formType" value={formType} />
          <Button type="submit" disabled={pending}>
            {pending ? nl.common.loading : f.prepareYes}
          </Button>
        </form>
      </div>

      {state.message ? (
        <p className="text-sm text-destructive">{state.message}</p>
      ) : null}
    </div>
  );
}
