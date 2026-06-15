"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  addCompetitionAthletes,
  type EntryFormState,
} from "@/features/competitions/actions";
import { nl } from "@/messages/nl";

/**
 * Detail-page multi-select to add athletes to a competition. Posts repeated
 * `athleteId` checkboxes + a shared category; the action batch-inserts entries
 * (editable per-entry afterwards) and revalidates in place.
 */
export function AddAthletesForm({
  competitionId,
  athletes,
}: {
  competitionId: string;
  athletes: { id: string; firstName: string; lastName: string }[];
}) {
  const [state, formAction, pending] = useActionState<EntryFormState, FormData>(
    addCompetitionAthletes,
    { ok: false },
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  const c = nl.competition;
  if (athletes.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">{c.noAthletesToAdd}</p>
    );
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="flex flex-col gap-3 rounded-lg border border-border p-4"
    >
      <input type="hidden" name="competitionId" value={competitionId} />
      <p className="text-sm font-semibold">{c.addAthlete}</p>

      <div className="flex flex-col gap-1.5">
        <Label>{c.entry.category}</Label>
        <Input name="category" placeholder="U14 Kata Individueel" />
        {state.fieldErrors?.category ? (
          <p className="text-sm text-destructive">{state.fieldErrors.category}</p>
        ) : null}
      </div>

      <div className="grid gap-1 sm:grid-cols-2">
        {athletes.map((a) => (
          <label key={a.id} className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="athleteId" value={a.id} />
            {a.firstName} {a.lastName}
          </label>
        ))}
      </div>
      {state.fieldErrors?.athleteId ? (
        <p className="text-sm text-destructive">{state.fieldErrors.athleteId}</p>
      ) : null}
      {state.message ? (
        <p className="text-sm text-destructive">{state.message}</p>
      ) : null}

      <div>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? nl.common.loading : c.addAthlete}
        </Button>
      </div>
    </form>
  );
}
