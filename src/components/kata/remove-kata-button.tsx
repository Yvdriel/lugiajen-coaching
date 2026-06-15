"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import {
  type AthleteKataFormState,
  removeAthleteKata,
} from "@/features/kata/actions";
import { nl } from "@/messages/nl";

export function RemoveKataButton({
  athleteId,
  id,
}: {
  athleteId: string;
  id: string;
}) {
  const [, formAction, pending] = useActionState<AthleteKataFormState, FormData>(
    removeAthleteKata,
    { ok: false },
  );

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!confirm(nl.kata.confirmRemove)) e.preventDefault();
      }}
    >
      <input type="hidden" name="athleteId" value={athleteId} />
      <input type="hidden" name="id" value={id} />
      <Button type="submit" variant="ghost" size="sm" disabled={pending}>
        {nl.kata.remove}
      </Button>
    </form>
  );
}
