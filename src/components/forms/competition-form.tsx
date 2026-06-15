"use client";

import Link from "next/link";
import { type ReactNode, useActionState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { CompetitionFormState } from "@/features/competitions/actions";
import { COMPETITION_TYPES } from "@/features/competitions/schema";
import { nl } from "@/messages/nl";

type Values = {
  name: string;
  date: string;
  location: string;
  competitionType: "" | (typeof COMPETITION_TYPES)[number];
  notes: string;
};

const EMPTY: Values = {
  name: "",
  date: "",
  location: "",
  competitionType: "",
  notes: "",
};

const selectClass =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm shadow-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export type CompetitionFormProps = {
  action: (
    prev: CompetitionFormState,
    formData: FormData,
  ) => Promise<CompetitionFormState>;
  defaultValues?: Partial<Values>;
  competitionId?: string;
  submitLabel: string;
  cancelHref: string;
};

export function CompetitionForm({
  action,
  defaultValues,
  competitionId,
  submitLabel,
  cancelHref,
}: CompetitionFormProps) {
  const [state, formAction, pending] = useActionState<
    CompetitionFormState,
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

  const f = nl.competition.fields;

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      {competitionId ? (
        <input type="hidden" name="id" value={competitionId} />
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={f.name} error={errors.name?.message}>
          <Input {...register("name")} />
        </Field>
        <Field label={f.date} error={errors.date?.message}>
          <Input type="date" {...register("date")} />
        </Field>
        <Field label={f.type} error={errors.competitionType?.message}>
          <select className={selectClass} {...register("competitionType")}>
            <option value="">—</option>
            {COMPETITION_TYPES.map((t) => (
              <option key={t} value={t}>
                {nl.competition.types[t]}
              </option>
            ))}
          </select>
        </Field>
        <Field label={f.location}>
          <Input {...register("location")} />
        </Field>
      </div>

      <Field label={f.notes}>
        <Textarea rows={3} {...register("notes")} />
      </Field>

      {state.message ? (
        <p className="text-sm text-destructive">{state.message}</p>
      ) : null}

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? nl.common.loading : submitLabel}
        </Button>
        <Link href={cancelHref} className={buttonVariants({ variant: "outline" })}>
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
