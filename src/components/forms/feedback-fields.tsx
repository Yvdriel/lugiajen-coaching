"use client";

import Link from "next/link";
import { type ReactNode, useActionState, useEffect, useState } from "react";
import { type FieldErrors, type UseFormRegister, useForm } from "react-hook-form";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { FeedbackFormState } from "@/features/feedback/actions";
import { type FormType, maxMeetingNumber } from "@/features/feedback/form-type";
import {
  ACTION_COUNT_FIELD,
  actionKataField,
  actionTextField,
  type Disposition,
  kataNotesField,
  kataScoreField,
  prepActionDispField,
  prepActionReasonField,
  prepGoalDispField,
  prepGoalReasonField,
  reviewActionCarryField,
  reviewActionDispField,
  reviewActionNoteField,
  reviewGoalCarryTextField,
  reviewGoalDispField,
  reviewGoalMomentumField,
  reviewGoalReasonField,
} from "@/features/feedback/schema";
import { useMessages } from "@/i18n/client";

// Native <select> styling — matches competition-entry-form (no shadcn Select dep).
const selectClass =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm shadow-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

// Shared primitives for the feedback forms (all templates). All field values are strings
// (native FormData); the server coerces. RHF register is typed over a string record.
export type FBValues = Record<string, string>;
export type FBRegister = UseFormRegister<FBValues>;
export type FBErrors = FieldErrors<FBValues>;

export function Field({
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

export function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-1 text-sm font-semibold">{title}</legend>
      {children}
    </fieldset>
  );
}

// `readOnly` (NOT `disabled`) when soft-locked: a disabled input is omitted from
// FormData, which would null the athlete's answer on the coach's save. readOnly still
// submits. The muted styling makes the lock visible.
const readOnlyCls = (readOnly?: boolean) =>
  readOnly ? "bg-muted text-muted-foreground" : "";

export function TextField({
  label,
  name,
  register,
  rows = 2,
  readOnly,
}: {
  label: string;
  name: string;
  register: FBRegister;
  rows?: number;
  readOnly?: boolean;
}) {
  return (
    <Field label={label}>
      <Textarea
        rows={rows}
        readOnly={readOnly}
        className={readOnlyCls(readOnly)}
        {...register(name)}
      />
    </Field>
  );
}

export function RatingField({
  label,
  name,
  register,
  error,
  readOnly,
}: {
  label: string;
  name: string;
  register: FBRegister;
  error?: string;
  readOnly?: boolean;
}) {
  return (
    <Field label={label} error={error}>
      <Input
        type="number"
        min={1}
        max={5}
        readOnly={readOnly}
        className={`w-24 ${readOnlyCls(readOnly)}`}
        {...register(name)}
      />
    </Field>
  );
}

export function HeaderFields({
  register,
  errors,
  maxMeeting = 3,
}: {
  register: FBRegister;
  errors: FBErrors;
  maxMeeting?: number;
}) {
  const nl = useMessages();
  const f = nl.feedback;
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Field label={f.meeting} error={errors.meetingNumber?.message}>
        <Input
          type="number"
          min={1}
          max={maxMeeting}
          {...register("meetingNumber")}
        />
      </Field>
      <Field label={f.date} error={errors.meetingDate?.message}>
        <Input type="date" {...register("meetingDate")} />
      </Field>
      <Field label={f.season} error={errors.season?.message}>
        <Input {...register("season")} />
      </Field>
    </div>
  );
}

export function CoachSection({ register }: { register: FBRegister }) {
  const nl = useMessages();
  const f = nl.feedback;
  return (
    <Section title={f.sideB}>
      <TextField
        label={f.fields.coachStrength}
        name="coachStrength"
        register={register}
      />
      <TextField
        label={f.fields.coachDevelopmentArea}
        name="coachDevelopmentArea"
        register={register}
      />
    </Section>
  );
}

// ── Dynamic, kata-taggable action items ───────────────────────────────────────
export type ActionItemDefault = { text: string; kataId: string | null };

type ActionRow = { key: string; text: string; kataId: string };
let actionRowSeq = 0;
const blankRow = (text = "", kataId = ""): ActionRow => ({
  key: `air-${actionRowSeq++}`,
  text,
  kataId,
});

export function ActionItemsList({
  repertoire,
  defaultItems,
}: {
  repertoire: KataRepertoireItem[];
  defaultItems: ActionItemDefault[];
}) {
  const f = useMessages().feedback;
  const [rows, setRows] = useState<ActionRow[]>(() =>
    defaultItems.length > 0
      ? defaultItems.map((d) => blankRow(d.text, d.kataId ?? ""))
      : [blankRow()],
  );

  return (
    <Section title={f.actionItems}>
      {/* Row count bounds the server-side parse loop (names re-index by position). */}
      <input type="hidden" name={ACTION_COUNT_FIELD} value={rows.length} readOnly />
      <div className="flex flex-col gap-2">
        {rows.map((row, i) => (
          <div
            key={row.key}
            className="grid gap-2 sm:grid-cols-[1fr_11rem_auto]"
          >
            <Input
              name={actionTextField(i)}
              defaultValue={row.text}
              placeholder={f.actions.placeholder}
              aria-label={`${f.actionItems} ${i + 1}`}
            />
            <select
              name={actionKataField(i)}
              defaultValue={row.kataId}
              className={selectClass}
              aria-label={f.actions.kata}
            >
              <option value="">{f.actions.general}</option>
              {repertoire.map((k) => (
                <option key={k.kataId} value={k.kataId}>
                  {k.kataName}
                </option>
              ))}
            </select>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() =>
                setRows((rs) => rs.filter((r) => r.key !== row.key))
              }
            >
              {f.actions.remove}
            </Button>
          </div>
        ))}
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{f.actions.empty}</p>
        ) : null}
      </div>
      <div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setRows((rs) => [...rs, blankRow()])}
        >
          {f.actions.add}
        </Button>
      </div>
    </Section>
  );
}

// ── Review panel ("Sinds vorige afspraak") ────────────────────────────────────
export type ReviewGoalItem = {
  id: string;
  category: "main" | "performance" | "outcome" | "kata_focus";
  text: string;
  athleteDisposition: Disposition | null;
  athleteReason: string | null;
};
export type ReviewActionItem = {
  id: string;
  text: string;
  kataName: string | null;
  athleteDisposition: Disposition | null;
  athleteReason: string | null;
};
export type FeedbackReview = {
  goals: ReviewGoalItem[];
  actions: ReviewActionItem[];
};

// Coach's goal verdict mapped to the athlete's claim vocabulary, for mismatch.
function goalVerdictToClaim(v: string): Disposition | null {
  if (v === "achieved") return "done";
  if (v === "carried") return "partly";
  if (v === "dropped") return "not_done";
  return null;
}

function AthleteClaim({
  disposition,
  reason,
  mismatch,
}: {
  disposition: Disposition;
  reason: string | null;
  mismatch: boolean;
}) {
  const f = useMessages().feedback;
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
      <span className="font-medium">{f.review.athleteClaim}:</span>
      <span>{f.disposition[disposition]}</span>
      {reason ? <span className="italic">“{reason}”</span> : null}
      {mismatch ? (
        <Badge variant="outline" className="font-semibold uppercase">
          {f.review.mismatch}
        </Badge>
      ) : null}
    </div>
  );
}

function ReviewGoalRow({
  goal,
  fieldErrors,
}: {
  goal: ReviewGoalItem;
  fieldErrors?: Record<string, string>;
}) {
  const f = useMessages().feedback;
  const [verdict, setVerdict] = useState("");
  const coachClaim = goalVerdictToClaim(verdict);
  const mismatch =
    !!goal.athleteDisposition &&
    !!coachClaim &&
    goal.athleteDisposition !== coachClaim;
  const needsReason = verdict === "dropped" || verdict === "carried";
  return (
    <div className="flex flex-col gap-2 rounded-md border p-3">
      <span className="text-sm font-medium">{goal.text}</span>
      {goal.athleteDisposition ? (
        <AthleteClaim
          disposition={goal.athleteDisposition}
          reason={goal.athleteReason}
          mismatch={mismatch}
        />
      ) : null}
      <div className="grid gap-2 sm:grid-cols-2">
        <select
          name={reviewGoalDispField(goal.id)}
          className={selectClass}
          value={verdict}
          onChange={(e) => setVerdict(e.target.value)}
          aria-label={goal.text}
        >
          <option value="">{f.review.choose}</option>
          <option value="achieved">{f.review.goalAchieved}</option>
          <option value="carried">{f.review.goalCarried}</option>
          <option value="dropped">{f.review.goalDropped}</option>
        </select>
        {verdict === "carried" ? (
          <select
            name={reviewGoalMomentumField(goal.id)}
            className={selectClass}
            defaultValue=""
            aria-label={f.review.momentum}
          >
            <option value="">{f.review.momentum}…</option>
            <option value="progressing">{f.review.momentumProgressing}</option>
            <option value="stalled">{f.review.momentumStalled}</option>
          </select>
        ) : null}
      </div>
      {verdict === "carried" && fieldErrors?.[reviewGoalMomentumField(goal.id)] ? (
        <p className="text-sm text-destructive">
          {fieldErrors[reviewGoalMomentumField(goal.id)]}
        </p>
      ) : null}
      {needsReason ? (
        <Field
          label={f.review.reason}
          error={fieldErrors?.[reviewGoalReasonField(goal.id)]}
        >
          <Input
            name={reviewGoalReasonField(goal.id)}
            placeholder={f.review.reasonPlaceholder}
          />
        </Field>
      ) : null}
      {verdict === "carried" ? (
        <Field label={f.review.carry}>
          <Input
            name={reviewGoalCarryTextField(goal.id)}
            defaultValue={goal.text}
          />
        </Field>
      ) : null}
    </div>
  );
}

function ReviewActionRow({ action }: { action: ReviewActionItem }) {
  const f = useMessages().feedback;
  const [verdict, setVerdict] = useState("");
  const mismatch =
    !!action.athleteDisposition &&
    verdict !== "" &&
    action.athleteDisposition !== verdict;
  return (
    <div className="flex flex-col gap-2 rounded-md border p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{action.text}</span>
        <Badge variant="outline">{action.kataName ?? f.actions.general}</Badge>
      </div>
      {action.athleteDisposition ? (
        <AthleteClaim
          disposition={action.athleteDisposition}
          reason={action.athleteReason}
          mismatch={mismatch}
        />
      ) : null}
      <div className="grid gap-2 sm:grid-cols-2">
        <select
          name={reviewActionDispField(action.id)}
          className={selectClass}
          value={verdict}
          onChange={(e) => setVerdict(e.target.value)}
          aria-label={action.text}
        >
          <option value="">{f.review.choose}</option>
          <option value="done">{f.disposition.done}</option>
          <option value="partly">{f.disposition.partly}</option>
          <option value="not_done">{f.disposition.not_done}</option>
        </select>
        <Input
          name={reviewActionNoteField(action.id)}
          placeholder={f.review.note}
        />
      </div>
      {verdict !== "" && verdict !== "done" ? (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name={reviewActionCarryField(action.id)} />
          {f.review.carry}
        </label>
      ) : null}
    </div>
  );
}

export function ReviewPanel({
  review,
  fieldErrors,
}: {
  review: FeedbackReview;
  fieldErrors?: Record<string, string>;
}) {
  const f = useMessages().feedback;
  if (review.goals.length === 0 && review.actions.length === 0) return null;
  return (
    <div className="flex flex-col gap-4 rounded-md border border-dashed p-4">
      <span className="text-sm font-semibold">{f.review.title}</span>
      {review.goals.length > 0 ? (
        <div className="flex flex-col gap-3">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {f.review.goalsTitle}
          </span>
          {review.goals.map((g) => (
            <ReviewGoalRow key={g.id} goal={g} fieldErrors={fieldErrors} />
          ))}
        </div>
      ) : null}
      {review.actions.length > 0 ? (
        <div className="flex flex-col gap-3">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {f.review.actionsTitle}
          </span>
          {review.actions.map((a) => (
            <ReviewActionRow key={a.id} action={a} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

// ── Athlete self-disposition (prepare flow, Side A) ───────────────────────────
function AthleteReviewRow({
  text,
  kataName,
  dispField,
  reasonField,
  fieldErrors,
}: {
  text: string;
  kataName: string | null;
  dispField: string;
  reasonField: string;
  fieldErrors?: Record<string, string>;
}) {
  const f = useMessages().feedback;
  const [disp, setDisp] = useState("");
  const needsReason = disp === "partly" || disp === "not_done";
  return (
    <div className="flex flex-col gap-2 rounded-md border p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{text}</span>
        {kataName ? <Badge variant="outline">{kataName}</Badge> : null}
      </div>
      <select
        name={dispField}
        className={selectClass}
        value={disp}
        onChange={(e) => setDisp(e.target.value)}
        aria-label={text}
      >
        <option value="">{f.review.choose}</option>
        <option value="done">{f.disposition.done}</option>
        <option value="partly">{f.disposition.partly}</option>
        <option value="not_done">{f.disposition.not_done}</option>
      </select>
      {needsReason ? (
        <Field label={f.review.reason} error={fieldErrors?.[reasonField]}>
          <Textarea
            name={reasonField}
            rows={2}
            placeholder={f.review.reasonPlaceholder}
          />
        </Field>
      ) : null}
    </div>
  );
}

export function AthleteReviewPanel({
  review,
  fieldErrors,
}: {
  review: FeedbackReview;
  fieldErrors?: Record<string, string>;
}) {
  const f = useMessages().feedback;
  if (review.goals.length === 0 && review.actions.length === 0) return null;
  return (
    <div className="flex flex-col gap-4 rounded-md border border-dashed p-4">
      <span className="text-sm font-semibold">{f.review.title}</span>
      {review.goals.length > 0 ? (
        <div className="flex flex-col gap-3">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {f.review.goalsTitle}
          </span>
          {review.goals.map((g) => (
            <AthleteReviewRow
              key={g.id}
              text={g.text}
              kataName={null}
              dispField={prepGoalDispField(g.id)}
              reasonField={prepGoalReasonField(g.id)}
              fieldErrors={fieldErrors}
            />
          ))}
        </div>
      ) : null}
      {review.actions.length > 0 ? (
        <div className="flex flex-col gap-3">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {f.review.actionsTitle}
          </span>
          {review.actions.map((a) => (
            <AthleteReviewRow
              key={a.id}
              text={a.text}
              kataName={a.kataName ?? f.actions.general}
              dispField={prepActionDispField(a.id)}
              reasonField={prepActionReasonField(a.id)}
              fieldErrors={fieldErrors}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

// ── Kata self-rating (CADET / JUNIOR / SENIOR) ────────────────────────────────
export type KataRepertoireItem = { kataId: string; kataName: string };

export function KataSelfRating({
  repertoire,
  register,
  readOnly,
}: {
  repertoire: KataRepertoireItem[];
  register: FBRegister;
  readOnly?: boolean;
}) {
  const nl = useMessages();
  const f = nl.feedback;
  if (repertoire.length === 0) return null;
  return (
    <Section title={f.kataSelfRating}>
      <p className="text-sm text-muted-foreground">{f.kataSelfRatingHint}</p>
      <div className="flex flex-col gap-3">
        {repertoire.map((k) => (
          <div
            key={k.kataId}
            className="flex flex-col gap-2 rounded-md border p-3"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium">{k.kataName}</span>
              <Input
                type="number"
                min={1}
                max={10}
                readOnly={readOnly}
                className={`w-20 ${readOnlyCls(readOnly)}`}
                aria-label={`${k.kataName} — ${f.kataSelfScore}`}
                {...register(kataScoreField(k.kataId))}
              />
            </div>
            <Textarea
              rows={2}
              readOnly={readOnly}
              className={readOnlyCls(readOnly)}
              placeholder={f.kataSelfNotes}
              {...register(kataNotesField(k.kataId))}
            />
          </div>
        ))}
      </div>
    </Section>
  );
}

// ── Side A (athlete self-assessment) — single source of truth ─────────────────
// Renders only the athlete-fillable fields for a template, plus the kata self-rating
// block. Reused by the public prepare form (editable) AND the coach meeting form
// (readOnly soft-lock). Does NOT render its own outer <Section> — the caller wraps it
// in <Section> or <LockableSection> with the Side A title.
export function SideAFields({
  formType,
  register,
  errors,
  repertoire = [],
  readOnly = false,
}: {
  formType: FormType;
  register: FBRegister;
  errors: FBErrors;
  repertoire?: KataRepertoireItem[];
  readOnly?: boolean;
}) {
  const f = useMessages().feedback;
  const ro = readOnly;
  return (
    <>
      {formType === "U12" ? (
        <>
          <TextField label={f.fields.athleteProudOf} name="athleteProudOf" register={register} readOnly={ro} />
          <TextField label={f.fields.athleteHardestThing} name="athleteHardestThing" register={register} readOnly={ro} />
          <TextField label={f.fields.athleteShowParents} name="athleteShowParents" register={register} readOnly={ro} />
          <RatingField label={f.fields.athleteFunScore} name="athleteFunScore" register={register} error={errors.athleteFunScore?.message} readOnly={ro} />
          <TextField label={f.fields.athleteMakeMoreFun} name="athleteMakeMoreFun" register={register} readOnly={ro} />
          <TextField label={f.fields.athleteQuestion} name="athleteQuestion" register={register} readOnly={ro} />
        </>
      ) : formType === "CADET" ? (
        <>
          <TextField label={f.fields.athleteProudOf} name="athleteProudOf" register={register} readOnly={ro} />
          <TextField label={f.fields.athleteHardestThing} name="athleteHardestThing" register={register} readOnly={ro} />
          <div className="grid gap-4 sm:grid-cols-2">
            <RatingField label={f.fields.selfRatingTraining} name="selfRatingTraining" register={register} error={errors.selfRatingTraining?.message} readOnly={ro} />
            <RatingField label={f.fields.selfRatingMotivation} name="selfRatingMotivation" register={register} error={errors.selfRatingMotivation?.message} readOnly={ro} />
            <RatingField label={f.fields.selfRatingBody} name="selfRatingBody" register={register} error={errors.selfRatingBody?.message} readOnly={ro} />
            <RatingField label={f.fields.selfRatingCompetition} name="selfRatingCompetition" register={register} error={errors.selfRatingCompetition?.message} readOnly={ro} />
          </div>
          <TextField label={f.fields.athleteNeedsWork} name="athleteNeedsWork" register={register} readOnly={ro} />
          <TextField label={f.fields.athleteQuestion} name="athleteQuestion" register={register} readOnly={ro} />
        </>
      ) : formType === "JUNIOR" ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <RatingField label={f.fields.selfRatingTraining} name="selfRatingTraining" register={register} error={errors.selfRatingTraining?.message} readOnly={ro} />
            <RatingField label={f.fields.selfRatingMotivation} name="selfRatingMotivation" register={register} error={errors.selfRatingMotivation?.message} readOnly={ro} />
            <RatingField label={f.fields.selfRatingBody} name="selfRatingBody" register={register} error={errors.selfRatingBody?.message} readOnly={ro} />
            <RatingField label={f.fields.selfRatingCompetition} name="selfRatingCompetition" register={register} error={errors.selfRatingCompetition?.message} readOnly={ro} />
          </div>
          <TextField label={f.fields.trainingQualityReflection} name="trainingQualityReflection" register={register} rows={3} readOnly={ro} />
          <TextField label={f.fields.competitionReflection} name="competitionReflection" register={register} rows={3} readOnly={ro} />
          <TextField label={f.fields.mentalPreparation} name="mentalPreparation" register={register} rows={3} readOnly={ro} />
          <TextField label={f.fields.athleteQuestion} name="athleteQuestion" register={register} readOnly={ro} />
        </>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <RatingField label={f.fields.selfRatingTraining} name="selfRatingTraining" register={register} error={errors.selfRatingTraining?.message} readOnly={ro} />
            <RatingField label={f.fields.selfRatingTrainingQuality} name="selfRatingTrainingQuality" register={register} error={errors.selfRatingTrainingQuality?.message} readOnly={ro} />
            <RatingField label={f.fields.selfRatingMotivation} name="selfRatingMotivation" register={register} error={errors.selfRatingMotivation?.message} readOnly={ro} />
            <RatingField label={f.fields.selfRatingBody} name="selfRatingBody" register={register} error={errors.selfRatingBody?.message} readOnly={ro} />
            <RatingField label={f.fields.selfRatingRecovery} name="selfRatingRecovery" register={register} error={errors.selfRatingRecovery?.message} readOnly={ro} />
            <RatingField label={f.fields.selfRatingMental} name="selfRatingMental" register={register} error={errors.selfRatingMental?.message} readOnly={ro} />
          </div>
          <TextField label={f.fields.trainingPeriodReflection} name="trainingPeriodReflection" register={register} rows={4} readOnly={ro} />
          <TextField label={f.fields.physicalStateNotes} name="physicalStateNotes" register={register} rows={3} readOnly={ro} />
          <TextField label={f.fields.competitionReflection} name="competitionReflection" register={register} rows={3} readOnly={ro} />
          <TextField label={f.fields.mentalPreparationReview} name="mentalPreparationReview" register={register} rows={3} readOnly={ro} />
          <TextField label={f.fields.athleteDiscussionPoints} name="athleteDiscussionPoints" register={register} rows={3} readOnly={ro} />
        </>
      )}
      <KataSelfRating repertoire={repertoire} register={register} readOnly={ro} />
    </>
  );
}

// Soft-lock wrapper: a titled block with an edit/lock toggle in the header. Passes the
// current `locked` state to its render-prop child (which feeds SideAFields.readOnly).
export function LockableSection({
  title,
  defaultLocked,
  children,
}: {
  title: string;
  defaultLocked: boolean;
  children: (locked: boolean) => ReactNode;
}) {
  const [locked, setLocked] = useState(defaultLocked);
  const f = useMessages().feedback;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">{title}</span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setLocked((l) => !l)}
        >
          {locked ? f.unlock : f.lock}
        </Button>
      </div>
      {children(locked)}
    </div>
  );
}

/**
 * Side A wrapped for a template: a plain Section normally, or a LockableSection
 * (locked by default, athlete answers shown readOnly) at the in-person meeting after
 * the athlete prepared. `lock` is the only difference between the two coach modes.
 */
export function SideASection({
  formType,
  register,
  errors,
  repertoire = [],
  lock = false,
}: {
  formType: FormType;
  register: FBRegister;
  errors: FBErrors;
  repertoire?: KataRepertoireItem[];
  lock?: boolean;
}) {
  const f = useMessages().feedback;
  if (lock) {
    return (
      <LockableSection title={f.sideA} defaultLocked>
        {(locked) => (
          <SideAFields
            formType={formType}
            register={register}
            errors={errors}
            repertoire={repertoire}
            readOnly={locked}
          />
        )}
      </LockableSection>
    );
  }
  return (
    <Section title={f.sideA}>
      <SideAFields
        formType={formType}
        register={register}
        errors={errors}
        repertoire={repertoire}
      />
    </Section>
  );
}

/**
 * Shared RHF wiring for every template: header (gesprek/datum/seizoen) + the
 * template-specific body (Side A, coach side, goals — via `children`) + action
 * items (4th item for SENIOR). Native FormData + server-authoritative zod (no
 * client resolver), `setError` re-hydration. Used for create + edit.
 */
export type FeedbackFormShellProps = {
  formType: FormType;
  athleteId: string;
  feedbackId?: string;
  defaultValues: FBValues;
  // Repertoire feeds the action-item kata picker (empty for U12 → general only).
  repertoire?: KataRepertoireItem[];
  // Existing (non-carried) action rows to pre-fill the dynamic list on edit.
  actionDefaults?: ActionItemDefault[];
  // Previous meeting's open goals + pending actions for the review panel.
  review?: FeedbackReview;
  action: (
    prev: FeedbackFormState,
    formData: FormData,
  ) => Promise<FeedbackFormState>;
  submitLabel: string;
  children: (register: FBRegister, errors: FBErrors) => ReactNode;
};

export type FeedbackTemplateProps = Omit<
  FeedbackFormShellProps,
  "formType" | "children"
> & {
  // Soft-lock Side A (the in-person meeting after the athlete prepared).
  lockSideA?: boolean;
};

// Templates that include the kata self-rating block (CADET / JUNIOR / SENIOR).
export type KataTemplateProps = FeedbackTemplateProps & {
  repertoire: KataRepertoireItem[];
};

export function FeedbackFormShell({
  formType,
  athleteId,
  feedbackId,
  defaultValues,
  repertoire,
  actionDefaults,
  review,
  action,
  submitLabel,
  children,
}: FeedbackFormShellProps) {
  const nl = useMessages();
  const [state, formAction, pending] = useActionState<
    FeedbackFormState,
    FormData
  >(action, { ok: false });
  const {
    register,
    setError,
    formState: { errors },
  } = useForm<FBValues>({ mode: "onBlur", defaultValues });

  useEffect(() => {
    if (!state.fieldErrors) return;
    for (const [key, message] of Object.entries(state.fieldErrors)) {
      setError(key, { message });
    }
  }, [state, setError]);

  return (
    <form action={formAction} className="flex flex-col gap-6" noValidate>
      <input type="hidden" name="formType" value={formType} />
      <input type="hidden" name="athleteId" value={athleteId} />
      {feedbackId ? <input type="hidden" name="id" value={feedbackId} /> : null}

      <HeaderFields
        register={register}
        errors={errors}
        maxMeeting={maxMeetingNumber(formType)}
      />
      {review ? (
        <ReviewPanel review={review} fieldErrors={state.fieldErrors} />
      ) : null}
      {children(register, errors)}
      <ActionItemsList
        repertoire={repertoire ?? []}
        defaultItems={actionDefaults ?? []}
      />

      {state.message ? (
        <p className="text-sm text-destructive">{state.message}</p>
      ) : null}

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? nl.common.loading : submitLabel}
        </Button>
        <Link
          href={
            feedbackId
              ? `/athletes/${athleteId}/feedback/${feedbackId}`
              : `/athletes/${athleteId}?tab=feedback`
          }
          className={buttonVariants({ variant: "outline" })}
        >
          {nl.common.cancel}
        </Link>
      </div>
    </form>
  );
}
