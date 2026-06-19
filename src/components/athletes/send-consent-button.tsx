"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  type AthleteFormState,
  sendConsentEmail,
} from "@/features/athletes/actions";
import { useMessages } from "@/i18n/client";

/**
 * Coach affordance: request parental consent by email. With a contact email on
 * file it submits directly; without one it opens a native `<dialog>` to capture the
 * parent's email first. The coach never sets consent — this only sends the link.
 */
export function SendConsentButton({
  athleteId,
  hasEmail,
  resend = false,
}: {
  athleteId: string;
  hasEmail: boolean;
  resend?: boolean;
}) {
  const nl = useMessages();
  const p = nl.athlete.privacy;
  const [state, formAction, pending] = useActionState<
    AthleteFormState,
    FormData
  >(sendConsentEmail, { ok: false });
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Close the dialog once the send succeeds.
  useEffect(() => {
    if (state.ok) dialogRef.current?.close();
  }, [state.ok]);

  const label = resend ? p.consentResend : p.sendConsentEmail;
  const message = state.message ? (
    <p
      className={`text-sm ${state.ok ? "text-muted-foreground" : "text-destructive"}`}
    >
      {state.message}
    </p>
  ) : null;

  if (hasEmail) {
    return (
      <div className="flex flex-col gap-1">
        <form action={formAction}>
          <input type="hidden" name="athleteId" value={athleteId} />
          <Button
            type="submit"
            size="sm"
            variant="outline"
            disabled={pending}
            className="w-fit"
          >
            {label}
          </Button>
        </form>
        {message}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="w-fit"
        onClick={() => dialogRef.current?.showModal()}
      >
        {label}
      </Button>
      {message}
      <dialog
        ref={dialogRef}
        className="fixed inset-0 m-auto h-fit w-80 max-w-[calc(100vw-2rem)] rounded-lg border border-border bg-background p-0 text-foreground shadow-lg backdrop:bg-black/40"
      >
        <form action={formAction} className="flex flex-col gap-3 p-5">
          <input type="hidden" name="athleteId" value={athleteId} />
          <h2 className="text-sm font-semibold">{p.consentDialogTitle}</h2>
          <p className="text-xs text-muted-foreground">{p.consentDialogHint}</p>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="consent-email">{p.consentEmailLabel}</Label>
            <Input id="consent-email" name="email" type="email" required />
            {state.fieldErrors?.email ? (
              <p className="text-sm text-destructive">
                {state.fieldErrors.email}
              </p>
            ) : null}
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => dialogRef.current?.close()}
            >
              {nl.common.cancel}
            </Button>
            <Button type="submit" size="sm" disabled={pending}>
              {p.consentSend}
            </Button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
