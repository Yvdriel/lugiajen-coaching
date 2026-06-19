"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  deleteFeedbackDraft,
  type FeedbackFormState,
  sendPrepareEmail,
} from "@/features/feedback/actions";
import { useMessages } from "@/i18n/client";

/** Copy the public prepare link (athlete fills their part). */
export function PrepareLinkButton({ token }: { token: string }) {
  const f = useMessages().feedback;
  const [copied, setCopied] = useState(false);

  async function copy() {
    const url = `${window.location.origin}/feedback/prepare/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt(f.sharePrepareLink, url);
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={copy}>
      {copied ? f.prepareLinkCopied : f.sharePrepareLink}
    </Button>
  );
}

/**
 * Email the prepare link to the athlete's contact (send + resend). When `disabledReason`
 * is set (no contact email / consent missing), shows that note instead of the button.
 */
export function SendPrepareLinkButton({
  athleteId,
  feedbackId,
  alreadySent,
  disabledReason,
}: {
  athleteId: string;
  feedbackId: string;
  alreadySent: boolean;
  disabledReason?: string;
}) {
  const nl = useMessages();
  const [state, formAction, pending] = useActionState<
    FeedbackFormState,
    FormData
  >(sendPrepareEmail, { ok: false });

  if (disabledReason) {
    return <p className="text-sm text-muted-foreground">{disabledReason}</p>;
  }

  return (
    <div className="flex flex-col gap-1">
      <form action={formAction}>
        <input type="hidden" name="athleteId" value={athleteId} />
        <input type="hidden" name="id" value={feedbackId} />
        <Button type="submit" variant="outline" size="sm" disabled={pending}>
          {pending
            ? nl.common.loading
            : alreadySent
              ? nl.feedback.resendLink
              : nl.feedback.sendLink}
        </Button>
      </form>
      {state.message ? (
        <p
          className={`text-sm ${state.ok ? "text-muted-foreground" : "text-destructive"}`}
        >
          {state.message}
        </p>
      ) : null}
    </div>
  );
}

/** Delete an abandoned draft (confirm first; the action refuses completed forms). */
export function DeleteDraftButton({
  athleteId,
  feedbackId,
}: {
  athleteId: string;
  feedbackId: string;
}) {
  const f = useMessages().feedback;
  const [, formAction, pending] = useActionState<FeedbackFormState, FormData>(
    deleteFeedbackDraft,
    { ok: false },
  );
  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!window.confirm(f.confirmDeleteDraft)) e.preventDefault();
      }}
    >
      <input type="hidden" name="athleteId" value={athleteId} />
      <input type="hidden" name="id" value={feedbackId} />
      <Button
        type="submit"
        variant="ghost"
        size="sm"
        disabled={pending}
        className="text-destructive"
      >
        {f.deleteDraft}
      </Button>
    </form>
  );
}
