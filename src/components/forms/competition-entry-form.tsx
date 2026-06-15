"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useActionState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  type EntryFormState,
  updateCompetitionEntry,
} from "@/features/competitions/actions";
import { ENTRY_ROUNDS } from "@/features/competitions/schema";
import type { EntryValues } from "@/features/competitions/values";
import { nl } from "@/messages/nl";

const selectClass =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm shadow-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export type KataOption = { kataId: string; kataName: string };

export type CompetitionEntryFormProps = {
  competitionId: string;
  athleteId: string;
  entryId: string;
  athleteName: string;
  defaultValues: EntryValues;
  kataOptions: KataOption[];
};

export function CompetitionEntryForm({
  competitionId,
  athleteId,
  entryId,
  athleteName,
  defaultValues,
  kataOptions,
}: CompetitionEntryFormProps) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<EntryFormState, FormData>(
    updateCompetitionEntry,
    { ok: false },
  );
  const {
    register,
    setError,
    formState: { errors },
  } = useForm<EntryValues>({ mode: "onBlur", defaultValues });

  useEffect(() => {
    if (!state.fieldErrors) return;
    for (const [key, message] of Object.entries(state.fieldErrors)) {
      setError(key, { message });
    }
  }, [state, setError]);

  // Entry action returns a typed result (no redirect) so the wizard can reuse it;
  // here we close the editor by navigating back to the competition detail.
  useEffect(() => {
    if (state.ok) router.push(`/competitions/${competitionId}`);
  }, [state.ok, router, competitionId]);

  const c = nl.competition;

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      <input type="hidden" name="id" value={entryId} />
      <input type="hidden" name="competitionId" value={competitionId} />
      <input type="hidden" name="athleteId" value={athleteId} />

      <h2 className="font-heading text-lg font-medium">{athleteName}</h2>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label={c.entry.category} error={errors.category?.message}>
          <Input {...register("category")} />
        </Field>
        <Field label={c.entry.placement} error={errors.resultPlacement?.message}>
          <Input type="number" min={1} {...register("resultPlacement")} />
        </Field>
        <Field label={c.entry.roundReached}>
          <Input {...register("resultRoundReached")} />
        </Field>
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-sm font-semibold">{c.entry.kata}</legend>
        {ENTRY_ROUNDS.map((r) => (
          <div key={r.kata} className="grid gap-2 sm:grid-cols-[7rem_1fr_8rem]">
            <Label className="self-center">{c.rounds[r.labelKey]}</Label>
            <select className={selectClass} {...register(r.kata)}>
              <option value="">—</option>
              {kataOptions.map((k) => (
                <option key={k.kataId} value={k.kataId}>
                  {k.kataName}
                </option>
              ))}
            </select>
            <select className={selectClass} {...register(r.result)}>
              <option value="">{c.result.none}</option>
              <option value="win">{c.result.win}</option>
              <option value="loss">{c.result.loss}</option>
            </select>
          </div>
        ))}
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-sm font-semibold">
          {nl.feedback.title}
        </legend>
        <Field label={c.entry.feedbackBefore}>
          <Textarea rows={2} {...register("feedbackBefore")} />
        </Field>
        <Field label={c.entry.feedbackPerformance}>
          <Textarea rows={2} {...register("feedbackPerformance")} />
        </Field>
        <Field label={c.entry.feedbackImprovement}>
          <Textarea rows={2} {...register("feedbackImprovement")} />
        </Field>
        <Field label={c.entry.feedbackLesson}>
          <Textarea rows={2} {...register("feedbackLesson")} />
        </Field>
        <Field label={c.entry.coachNotes}>
          <Textarea rows={2} {...register("coachNotes")} />
        </Field>
      </fieldset>

      {state.message ? (
        <p className="text-sm text-destructive">{state.message}</p>
      ) : null}

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? nl.common.loading : c.entry.save}
        </Button>
        <Link
          href={`/competitions/${competitionId}`}
          className={buttonVariants({ variant: "outline" })}
        >
          {nl.common.cancel}
        </Link>
      </div>
    </form>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {children}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
