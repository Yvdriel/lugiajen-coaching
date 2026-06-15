"use client";

import Link from "next/link";
import { useActionState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  type AthleteKataFormState,
  updateAthleteKata,
} from "@/features/kata/actions";
import type { AthleteKataItem } from "@/lib/queries/kata";
import { nl } from "@/messages/nl";

type Values = {
  roundOrder: string;
  proficiency: string;
  isCompetitionKata: boolean;
  notes: string;
};

export function AthleteKataEditForm({
  athleteId,
  item,
}: {
  athleteId: string;
  item: AthleteKataItem;
}) {
  const [state, formAction, pending] = useActionState<
    AthleteKataFormState,
    FormData
  >(updateAthleteKata, { ok: false });
  const {
    register,
    setError,
    formState: { errors },
  } = useForm<Values>({
    mode: "onBlur",
    defaultValues: {
      roundOrder: item.roundOrder != null ? String(item.roundOrder) : "",
      proficiency: String(item.proficiency),
      isCompetitionKata: item.isCompetitionKata,
      notes: item.notes ?? "",
    },
  });

  useEffect(() => {
    if (!state.fieldErrors) return;
    for (const [key, message] of Object.entries(state.fieldErrors)) {
      setError(key as keyof Values, { message });
    }
  }, [state, setError]);

  const k = nl.kata;

  return (
    <form
      action={formAction}
      className="flex flex-col gap-4 rounded-lg border border-border p-4"
    >
      <p className="text-sm font-medium">
        {k.edit}: {item.kataName}
      </p>
      <input type="hidden" name="athleteId" value={athleteId} />
      <input type="hidden" name="id" value={item.id} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label>{k.roundOrder}</Label>
          <Input type="number" min={1} max={20} {...register("roundOrder")} />
          {errors.roundOrder?.message ? (
            <p className="text-sm text-destructive">{errors.roundOrder.message}</p>
          ) : null}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>{k.proficiency}</Label>
          <Input type="number" min={1} max={10} {...register("proficiency")} />
          {errors.proficiency?.message ? (
            <p className="text-sm text-destructive">
              {errors.proficiency.message}
            </p>
          ) : null}
        </div>
      </div>

      <label className="flex w-fit items-center gap-2 text-sm">
        <input type="checkbox" {...register("isCompetitionKata")} />
        {k.isCompetitionKata}
      </label>

      <div className="flex flex-col gap-1.5">
        <Label>{k.notes}</Label>
        <Textarea rows={2} {...register("notes")} />
      </div>

      {state.message ? (
        <p className="text-sm text-destructive">{state.message}</p>
      ) : null}

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? nl.common.loading : nl.common.save}
        </Button>
        <Link
          href={`/athletes/${athleteId}?tab=kata`}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          {nl.common.cancel}
        </Link>
      </div>
    </form>
  );
}
