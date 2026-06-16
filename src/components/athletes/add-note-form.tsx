"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  addAthleteNote,
  type AthleteFormState,
} from "@/features/athletes/actions";
import { useMessages } from "@/i18n/client";

export function AddNoteForm({ athleteId }: { athleteId: string }) {
  const nl = useMessages();
  const [state, formAction, pending] = useActionState<
    AthleteFormState,
    FormData
  >(addAthleteNote, { ok: false });
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="athleteId" value={athleteId} />
      <Textarea name="body" rows={3} placeholder={nl.athlete.notes.placeholder} />
      {state.fieldErrors?.body ? (
        <p className="text-sm text-destructive">{state.fieldErrors.body}</p>
      ) : null}
      <div>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? nl.common.loading : nl.athlete.notes.add}
        </Button>
      </div>
    </form>
  );
}
