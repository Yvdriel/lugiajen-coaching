"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import {
  type EntryFormState,
  removeCompetitionEntry,
} from "@/features/competitions/actions";
import { useMessages } from "@/i18n/client";

export function RemoveEntryButton({
  id,
  competitionId,
  athleteId,
}: {
  id: string;
  competitionId: string;
  athleteId: string;
}) {
  const nl = useMessages();
  const [, formAction, pending] = useActionState<EntryFormState, FormData>(
    removeCompetitionEntry,
    { ok: false },
  );

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!confirm(nl.competition.confirmRemoveEntry)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="competitionId" value={competitionId} />
      <input type="hidden" name="athleteId" value={athleteId} />
      <Button type="submit" variant="ghost" size="sm" disabled={pending}>
        {nl.competition.remove}
      </Button>
    </form>
  );
}
