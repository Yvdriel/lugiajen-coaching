"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import {
  type CompetitionFormState,
  removeCompetition,
} from "@/features/competitions/actions";
import { nl } from "@/messages/nl";

export function RemoveCompetitionButton({ id }: { id: string }) {
  const [, formAction, pending] = useActionState<CompetitionFormState, FormData>(
    removeCompetition,
    { ok: false },
  );

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!confirm(nl.competition.confirmRemove)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <Button type="submit" variant="ghost" size="sm" disabled={pending}>
        {nl.competition.remove}
      </Button>
    </form>
  );
}
