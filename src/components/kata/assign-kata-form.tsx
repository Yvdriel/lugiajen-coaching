"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  type AthleteKataFormState,
  assignKata,
} from "@/features/kata/actions";
import { useMessages } from "@/i18n/client";

const selectClass =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm shadow-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export type AssignKataOption = { id: string; name: string };

export function AssignKataForm({
  athleteId,
  options,
}: {
  athleteId: string;
  options: AssignKataOption[];
}) {
  const nl = useMessages();
  const [state, formAction, pending] = useActionState<
    AthleteKataFormState,
    FormData
  >(assignKata, { ok: false });
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  const k = nl.kata;

  if (options.length === 0) {
    return <p className="text-sm text-muted-foreground">{k.allAssigned}</p>;
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="flex flex-col gap-4 rounded-lg border border-border p-4"
    >
      <p className="text-sm font-medium">{k.assignTitle}</p>
      <input type="hidden" name="athleteId" value={athleteId} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label>{k.selectKata}</Label>
          <select className={selectClass} name="kataId" defaultValue="">
            <option value="" disabled>
              —
            </option>
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
          {state.fieldErrors?.kataId ? (
            <p className="text-sm text-destructive">{state.fieldErrors.kataId}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>{k.roundOrder}</Label>
          <Input type="number" min={1} max={20} name="roundOrder" />
        </div>
      </div>

      <label className="flex w-fit items-center gap-2 text-sm">
        <input type="checkbox" name="isCompetitionKata" />
        {k.isCompetitionKata}
      </label>

      <div className="flex flex-col gap-1.5">
        <Label>{k.notes}</Label>
        <Textarea rows={2} name="notes" />
      </div>

      {state.message ? (
        <p className="text-sm text-destructive">{state.message}</p>
      ) : null}

      <div>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? nl.common.loading : k.assign}
        </Button>
      </div>
    </form>
  );
}
