"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  deleteFeedbackDraft,
  type FeedbackFormState,
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
