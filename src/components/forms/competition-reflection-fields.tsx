"use client";

import { RatingMarks } from "@/components/display/rating-marks";
import { Badge } from "@/components/ui/badge";
import {
  type CompetitionPrepItem,
  crBeforeField,
  crImprovementField,
  crLessonField,
  crNotesField,
  crPerformanceField,
  crRatingField,
} from "@/features/feedback/schema";
import { useLocale, useMessages } from "@/i18n/client";
import { formatDate } from "@/i18n/format";
import { type FBRegister, Field, TextField } from "./feedback-fields";

/**
 * Athlete's per-competition reflection (CADET+), shown on the prepare link and as a
 * read-only recap after submit. Renders ONLY competition meta + the athlete's own
 * inputs — never the coach's per-entry feedback (that's revealed at the meeting).
 */
export function CompetitionReflectionFields({
  competitions,
  register,
  readOnly = false,
}: {
  competitions: CompetitionPrepItem[];
  register?: FBRegister;
  readOnly?: boolean;
}) {
  const nl = useMessages();
  const locale = useLocale();
  const cs = nl.feedback.competitionSection;
  const ct = nl.competition.types;

  if (competitions.length === 0) {
    return <p className="text-sm text-muted-foreground">{cs.empty}</p>;
  }

  return (
    <div className="flex flex-col gap-5">
      {competitions.map((c) => (
        <div
          key={c.competitionId}
          className="flex flex-col gap-3 rounded-lg border border-border p-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-medium">{c.competitionName}</p>
              <p className="text-sm text-muted-foreground">
                {formatDate(c.competitionDate, locale)} ·{" "}
                {c.categories.join(", ")}
              </p>
            </div>
            <Badge variant="outline">{ct[c.competitionType]}</Badge>
          </div>

          {readOnly ? (
            <ReadonlyReflection item={c} ratingLabel={cs.rating} fields={cs} />
          ) : (
            <div className="flex flex-col gap-3">
              <Field label={cs.rating}>
                <RatingMarksInput
                  name={crRatingField(c.competitionId)}
                  defaultValue={c.reflection.overallRating}
                />
              </Field>
              <TextField
                label={cs.before}
                name={crBeforeField(c.competitionId)}
                register={register!}
              />
              <TextField
                label={cs.performance}
                name={crPerformanceField(c.competitionId)}
                register={register!}
              />
              <TextField
                label={cs.improvement}
                name={crImprovementField(c.competitionId)}
                register={register!}
              />
              <TextField
                label={cs.lesson}
                name={crLessonField(c.competitionId)}
                register={register!}
              />
              <TextField
                label={cs.notes}
                name={crNotesField(c.competitionId)}
                register={register!}
                rows={3}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// A plain 1-5 number input — RatingField needs RHF register; this one is uncontrolled
// (defaultValue) so it works without threading the reflection values through RHF.
function RatingMarksInput({
  name,
  defaultValue,
}: {
  name: string;
  defaultValue: number | null;
}) {
  return (
    <input
      type="number"
      min={1}
      max={5}
      name={name}
      defaultValue={defaultValue ?? ""}
      className="h-8 w-24 rounded-lg border border-input bg-transparent px-2.5 text-sm shadow-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
    />
  );
}

function ReadonlyReflection({
  item,
  ratingLabel,
  fields,
}: {
  item: CompetitionPrepItem;
  ratingLabel: string;
  fields: {
    before: string;
    performance: string;
    improvement: string;
    lesson: string;
    notes: string;
  };
}) {
  const r = item.reflection;
  const rows: Array<[string, string | null]> = [
    [fields.before, r.before],
    [fields.performance, r.performance],
    [fields.improvement, r.improvement],
    [fields.lesson, r.lesson],
    [fields.notes, r.notes],
  ];
  return (
    <div className="flex flex-col gap-2">
      {r.overallRating != null ? (
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            {ratingLabel}
          </span>
          <RatingMarks value={r.overallRating} />
        </div>
      ) : null}
      {rows.map(([label, value]) =>
        value ? (
          <div key={label} className="flex flex-col gap-0.5">
            <span className="text-xs font-medium text-muted-foreground">
              {label}
            </span>
            <span className="whitespace-pre-wrap text-sm">{value}</span>
          </div>
        ) : null,
      )}
    </div>
  );
}
