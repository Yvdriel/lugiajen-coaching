"use client";

import Link from "next/link";
import { useActionState, useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  type ScoringFormState,
  saveScoringCard,
} from "@/features/scoring/actions";
import {
  CRITERION_GROUPS,
  criteriaForGroup,
  formatDelta,
  INPUT_CRITERIA,
  type NumericCriterionKey,
  TEXT_FIELDS,
} from "@/features/scoring/criteria";
import { useMessages } from "@/i18n/client";
import type { ScoringCardRow } from "@/lib/queries/scoring";

type Values = Record<string, string>;

export type ScoringCardFormProps = {
  athleteId: string;
  kataId: string;
  previousCard: ScoringCardRow | null;
  today: string;
};

export function ScoringCardForm({
  athleteId,
  kataId,
  previousCard,
  today,
}: ScoringCardFormProps) {
  const nl = useMessages();
  const [state, formAction, pending] = useActionState<ScoringFormState, FormData>(
    saveScoringCard,
    { ok: false },
  );

  // Numeric inputs prefill with the previous value (delta starts at →); text fields stay blank.
  // Overall impression is derived, not entered, so only the 12 input criteria get fields.
  const defaults: Values = { assessmentDate: today };
  for (const c of INPUT_CRITERIA) {
    defaults[c.key] = previousCard ? String(previousCard[c.key]) : "";
  }
  for (const k of TEXT_FIELDS) defaults[k] = "";

  const {
    register,
    setError,
    control,
    formState: { errors },
  } = useForm<Values>({ mode: "onBlur", defaultValues: defaults });

  useEffect(() => {
    if (!state.fieldErrors) return;
    for (const [key, message] of Object.entries(state.fieldErrors)) {
      setError(key, { message });
    }
  }, [state, setError]);

  const values = useWatch({ control }) as Values;
  const s = nl.scoring;

  // Live derived overall impression: mean of the 12 inputs once all are filled (else —).
  const allFilled = INPUT_CRITERIA.every((c) => {
    const v = values[c.key];
    return v != null && v !== "" && Number.isFinite(Number(v));
  });
  const overallPreview = allFilled
    ? Math.round(
        INPUT_CRITERIA.reduce((acc, c) => acc + Number(values[c.key]), 0) /
          INPUT_CRITERIA.length,
      )
    : null;

  return (
    <form action={formAction} className="flex flex-col gap-6" noValidate>
      <input type="hidden" name="athleteId" value={athleteId} />
      <input type="hidden" name="kataId" value={kataId} />

      <div className="flex flex-col gap-1.5">
        <Label>{s.assessmentDate}</Label>
        <Input
          type="date"
          className="w-fit"
          {...register("assessmentDate")}
        />
        {errors.assessmentDate?.message ? (
          <p className="text-sm text-destructive">
            {errors.assessmentDate.message}
          </p>
        ) : null}
      </div>

      {CRITERION_GROUPS.filter((group) => group !== "overall").map((group) => (
        <fieldset key={group} className="flex flex-col gap-3">
          <legend className="text-sm font-semibold">{s.groups[group]}</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {criteriaForGroup(group).map((c) => {
              const key = c.key as NumericCriterionKey;
              const prev = previousCard ? (previousCard[key] as number) : null;
              const raw = values[key];
              const cur = raw === "" || raw == null ? null : Number(raw);
              const delta =
                prev != null && cur != null && Number.isFinite(cur)
                  ? cur - prev
                  : null;
              return (
                <div key={key} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <Label>{s.criteria[key]}</Label>
                    {prev != null ? (
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {s.previous}: {prev}
                        {delta != null && delta !== 0 ? (
                          <span className="ml-1">{formatDelta(delta)}</span>
                        ) : null}
                      </span>
                    ) : null}
                  </div>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    inputMode="numeric"
                    {...register(key)}
                  />
                  {errors[key]?.message ? (
                    <p className="text-sm text-destructive">
                      {errors[key]?.message as string}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </fieldset>
      ))}

      <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-3 py-2">
        <Label>{s.criteria.overallImpression}</Label>
        <span className="text-sm font-semibold tabular-nums">
          {overallPreview == null ? "—" : `${overallPreview}/100`}
        </span>
      </div>

      <div className="flex flex-col gap-4">
        {TEXT_FIELDS.map((k) => (
          <div key={k} className="flex flex-col gap-1.5">
            <Label>{s.textFields[k]}</Label>
            <Textarea rows={2} {...register(k)} />
          </div>
        ))}
      </div>

      {state.message ? (
        <p className="text-sm text-destructive">{state.message}</p>
      ) : null}

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? nl.common.loading : s.save}
        </Button>
        <Link
          href={`/athletes/${athleteId}?tab=kata`}
          className={buttonVariants({ variant: "outline" })}
        >
          {nl.common.cancel}
        </Link>
      </div>
    </form>
  );
}
