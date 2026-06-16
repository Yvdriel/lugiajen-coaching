"use client";

import Link from "next/link";
import { type ReactNode, useActionState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { AthleteFormState } from "@/features/athletes/actions";
import { useMessages } from "@/i18n/client";

type Values = {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: "" | "male" | "female";
  beltRank: string;
  yearsTraining: string;
  yearsCompeting: string;
  heightCm: string;
  weightKg: string;
  notes: string;
  physicalNotes: string;
  isActive: boolean;
};

const EMPTY: Values = {
  firstName: "",
  lastName: "",
  dateOfBirth: "",
  gender: "",
  beltRank: "",
  yearsTraining: "",
  yearsCompeting: "",
  heightCm: "",
  weightKg: "",
  notes: "",
  physicalNotes: "",
  isActive: true,
};

const selectClass =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm shadow-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export type AthleteFormProps = {
  action: (
    prev: AthleteFormState,
    formData: FormData,
  ) => Promise<AthleteFormState>;
  defaultValues?: Partial<Values>;
  athleteId?: string;
  submitLabel: string;
};

export function AthleteForm({
  action,
  defaultValues,
  athleteId,
  submitLabel,
}: AthleteFormProps) {
  const nl = useMessages();
  const [state, formAction, pending] = useActionState<
    AthleteFormState,
    FormData
  >(action, { ok: false });
  const {
    register,
    setError,
    formState: { errors },
  } = useForm<Values>({
    mode: "onBlur",
    defaultValues: { ...EMPTY, ...defaultValues },
  });

  useEffect(() => {
    if (!state.fieldErrors) return;
    for (const [key, message] of Object.entries(state.fieldErrors)) {
      setError(key as keyof Values, { message });
    }
  }, [state, setError]);

  const f = nl.athlete.fields;

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      {athleteId ? <input type="hidden" name="id" value={athleteId} /> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={f.firstName} error={errors.firstName?.message}>
          <Input {...register("firstName")} />
        </Field>
        <Field label={f.lastName} error={errors.lastName?.message}>
          <Input {...register("lastName")} />
        </Field>
        <Field label={f.dateOfBirth} error={errors.dateOfBirth?.message}>
          <Input type="date" {...register("dateOfBirth")} />
        </Field>
        <Field label={f.gender} error={errors.gender?.message}>
          <select className={selectClass} {...register("gender")}>
            <option value="">—</option>
            <option value="male">{nl.athlete.gender.male}</option>
            <option value="female">{nl.athlete.gender.female}</option>
          </select>
        </Field>
        <Field label={f.beltRank} error={errors.beltRank?.message}>
          <Input {...register("beltRank")} />
        </Field>
        <Field label={f.yearsTraining} error={errors.yearsTraining?.message}>
          <Input type="number" min={0} {...register("yearsTraining")} />
        </Field>
        <Field label={f.yearsCompeting}>
          <Input type="number" min={0} {...register("yearsCompeting")} />
        </Field>
        <Field label={f.heightCm}>
          <Input type="number" min={0} {...register("heightCm")} />
        </Field>
        <Field label={f.weightKg}>
          <Input type="number" min={0} {...register("weightKg")} />
        </Field>
      </div>

      <Field label={f.notes}>
        <Textarea rows={3} {...register("notes")} />
      </Field>
      <Field label={f.physicalNotes}>
        <Textarea rows={3} {...register("physicalNotes")} />
      </Field>

      <label className="flex w-fit items-center gap-2 text-sm">
        <input type="checkbox" {...register("isActive")} />
        {f.isActive}
      </label>

      {state.message ? (
        <p className="text-sm text-destructive">{state.message}</p>
      ) : null}

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? nl.common.loading : submitLabel}
        </Button>
        <Link
          href={athleteId ? `/athletes/${athleteId}` : "/athletes"}
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
