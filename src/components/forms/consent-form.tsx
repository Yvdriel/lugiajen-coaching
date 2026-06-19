"use client";

import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ConsentFormState } from "@/features/athletes/consent-actions";
import { useMessages } from "@/i18n/client";

const COUNTDOWN_SECONDS = 10;

/**
 * Parent consent form: full name + an explicit "I consent" checkbox. Ticking the
 * box reveals the submit button behind a 10-second countdown (a deliberate pause so
 * the parent reads the explanation) with a visual progress bar. Consent is only
 * recorded server-side on submit.
 */
export function ConsentForm({
  action,
}: {
  action: (
    prev: ConsentFormState,
    formData: FormData,
  ) => Promise<ConsentFormState>;
}) {
  const c = useMessages().consent.page;
  const [state, formAction, pending] = useActionState<
    ConsentFormState,
    FormData
  >(action, { ok: false });
  const [agreed, setAgreed] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(COUNTDOWN_SECONDS);

  // Reset the clock in the change handler (not the effect) so we never setState
  // synchronously inside the effect body.
  function toggleAgree(checked: boolean) {
    setAgreed(checked);
    setSecondsLeft(COUNTDOWN_SECONDS);
  }

  // While agreed, tick down once per second; state is only set in the callback.
  useEffect(() => {
    if (!agreed) return;
    const id = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(id);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [agreed]);

  if (state.ok) {
    return (
      <div className="rounded-lg border border-border bg-muted/40 p-4">
        <p className="text-sm font-medium">{c.submitted}</p>
        <p className="text-sm text-muted-foreground">{c.submittedHint}</p>
      </div>
    );
  }

  const progress = ((COUNTDOWN_SECONDS - secondsLeft) / COUNTDOWN_SECONDS) * 100;
  const locked = secondsLeft > 0;

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="fullName">{c.fullNameLabel}</Label>
        <Input
          id="fullName"
          name="fullName"
          placeholder={c.fullNamePlaceholder}
          autoComplete="name"
        />
        {state.fieldErrors?.fullName ? (
          <p className="text-sm text-destructive">
            {state.fieldErrors.fullName}
          </p>
        ) : null}
      </div>

      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          className="mt-1"
          checked={agreed}
          onChange={(e) => toggleAgree(e.target.checked)}
        />
        <span>{c.agree}</span>
      </label>

      {agreed ? (
        <div className="flex flex-col gap-2">
          {locked ? (
            <div className="flex flex-col gap-1">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-foreground transition-[width] duration-1000 ease-linear"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {c.countdown} {secondsLeft}
                {c.countdownUnit}
              </p>
            </div>
          ) : null}
          <Button type="submit" disabled={pending || locked} className="w-fit">
            {c.submit}
          </Button>
        </div>
      ) : null}

      {state.message ? (
        <p className="text-sm text-destructive">{state.message}</p>
      ) : null}
    </form>
  );
}
