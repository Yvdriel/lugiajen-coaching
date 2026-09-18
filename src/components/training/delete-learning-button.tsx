"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import {
  deleteLearning,
  type LearningFormState,
} from "@/features/training/actions";
import { useMessages } from "@/i18n/client";

export function DeleteLearningButton({
  athleteId,
  id,
}: {
  athleteId: string;
  id: string;
}) {
  const nl = useMessages();
  const [, formAction, pending] = useActionState<LearningFormState, FormData>(
    deleteLearning,
    { ok: false },
  );

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!confirm(nl.athlete.learnings.confirmDelete)) e.preventDefault();
      }}
    >
      <input type="hidden" name="athleteId" value={athleteId} />
      <input type="hidden" name="id" value={id} />
      <Button type="submit" variant="ghost" size="sm" disabled={pending}>
        {nl.athlete.learnings.delete}
      </Button>
    </form>
  );
}
