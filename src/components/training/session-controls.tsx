"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { TrainingFormState } from "@/features/training/actions";
import { useMessages } from "@/i18n/client";

export type TrainingAction = (
  prev: TrainingFormState,
  fd: FormData,
) => Promise<TrainingFormState>;

const INIT: TrainingFormState = { ok: false };

function Hidden({ athleteId, kind, id }: { athleteId: string; kind: string; id: string }) {
  return (
    <>
      <input type="hidden" name="athleteId" value={athleteId} />
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="id" value={id} />
    </>
  );
}

export function SkipToggle({
  action,
  athleteId,
  kind,
  id,
  skipped,
}: {
  action: TrainingAction;
  athleteId: string;
  kind: "session" | "block";
  id: string;
  skipped: boolean;
}) {
  const t = useMessages().athlete.training;
  const [state, formAction, pending] = useActionState(action, INIT);
  return (
    <form action={formAction} className="print-hide">
      <Hidden athleteId={athleteId} kind={kind === "session" ? "skipSession" : "skipBlock"} id={id} />
      <input type="hidden" name="skipped" value={skipped ? "false" : "true"} />
      <Button type="submit" variant={skipped ? "secondary" : "outline"} size="sm" disabled={pending}>
        {skipped ? t.unskip : t.skip}
      </Button>
      {state.message ? <p className="mt-1 text-xs text-destructive">{state.message}</p> : null}
    </form>
  );
}

export function ActualReps({
  action,
  athleteId,
  blockId,
  planned,
  actual,
}: {
  action: TrainingAction;
  athleteId: string;
  blockId: string;
  planned: number;
  actual: number | null;
}) {
  const t = useMessages().athlete.training;
  const [state, formAction, pending] = useActionState(action, INIT);
  return (
    <form action={formAction} className="print-hide flex items-center gap-2">
      <Hidden athleteId={athleteId} kind="actualReps" id={blockId} />
      <label className="text-xs text-muted-foreground" htmlFor={`reps-${blockId}`}>
        {t.actualReps}
      </label>
      <Input
        id={`reps-${blockId}`}
        name="reps"
        type="number"
        inputMode="numeric"
        min={0}
        max={99}
        defaultValue={actual ?? ""}
        placeholder={String(planned)}
        className="h-8 w-16 text-center tabular-nums"
      />
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        {t.save}
      </Button>
      {state.ok ? <span className="text-xs text-muted-foreground">{t.saved}</span> : null}
      {state.message ? <span className="text-xs text-destructive">{state.message}</span> : null}
    </form>
  );
}

export function AthleteNotesForm({
  action,
  athleteId,
  sessionId,
  value,
}: {
  action: TrainingAction;
  athleteId: string;
  sessionId: string;
  value: string | null;
}) {
  const t = useMessages().athlete.training;
  const [state, formAction, pending] = useActionState(action, INIT);
  return (
    <form action={formAction} className="print-hide flex flex-col gap-2">
      <Hidden athleteId={athleteId} kind="athleteNotes" id={sessionId} />
      <label className="text-sm font-semibold" htmlFor={`notes-${sessionId}`}>
        {t.athleteNotes}
      </label>
      <Textarea
        id={`notes-${sessionId}`}
        name="text"
        defaultValue={value ?? ""}
        placeholder={t.athleteNotesHint}
        rows={3}
        maxLength={2000}
      />
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {t.save}
        </Button>
        {state.ok ? <span className="text-xs text-muted-foreground">{t.saved}</span> : null}
        {state.message ? <span className="text-xs text-destructive">{state.message}</span> : null}
      </div>
    </form>
  );
}
