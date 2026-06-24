import { RatingMarks } from "@/components/display/rating-marks";
import { Badge } from "@/components/ui/badge";
import type { MeetingCompetition } from "@/features/feedback/competitions";
import type { CompetitionEntry } from "@/lib/queries/competitions";
import { formatDate } from "@/i18n/format";
import { getLocale, getMessages } from "@/i18n/server";

/**
 * Coach-only, read-only competition section for the parent meeting (CADET+). Per
 * competition it pairs the coach's per-entry feedback (one block per category) against
 * the athlete's single reflection, field by field — lining up the two reads is the
 * point. Coach-private (renders coach feedback), so never used on athlete surfaces.
 */
export async function CompetitionMeetingPanel({
  competitions,
}: {
  competitions: MeetingCompetition[];
}) {
  const nl = await getMessages();
  const locale = await getLocale();
  const cs = nl.feedback.competitionSection;
  const e = nl.competition.entry;
  const ct = nl.competition.types;

  if (competitions.length === 0) {
    return <p className="text-sm text-muted-foreground">{cs.empty}</p>;
  }

  const dimensions = [
    { coach: "feedbackBefore", reflection: "before", label: e.feedbackBefore },
    {
      coach: "feedbackPerformance",
      reflection: "performance",
      label: e.feedbackPerformance,
    },
    {
      coach: "feedbackImprovement",
      reflection: "improvement",
      label: e.feedbackImprovement,
    },
    { coach: "feedbackLesson", reflection: "lesson", label: e.feedbackLesson },
  ] as const;

  return (
    <div className="flex flex-col gap-4">
      {competitions.map((c) => {
        const r = c.reflection;
        return (
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
              <div className="flex items-center gap-3">
                {r?.overallRating != null ? (
                  <RatingMarks value={r.overallRating} />
                ) : null}
                <Badge variant="outline">{ct[c.competitionType]}</Badge>
              </div>
            </div>

            {!r ? (
              <p className="text-sm text-muted-foreground">{cs.noReflection}</p>
            ) : null}

            {c.entries.map((entry) => (
              <div
                key={entry.id}
                className="flex flex-col gap-2 border-t border-border pt-3"
              >
                {c.entries.length > 1 ? (
                  <p className="text-xs font-medium text-muted-foreground">
                    {entry.category}
                  </p>
                ) : null}
                {/* column headers */}
                <div className="grid gap-2 sm:grid-cols-[8rem_1fr_1fr]">
                  <span className="hidden sm:block" />
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {cs.athleteColumn}
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {cs.coachColumn}
                  </span>
                </div>
                {dimensions.map((d) => (
                  <PairRow
                    key={d.coach}
                    label={d.label}
                    athlete={r ? reflectionField(r, d.reflection) : null}
                    coach={entryField(entry, d.coach)}
                  />
                ))}
              </div>
            ))}

            {r?.reflectionNotes ? (
              <div className="flex flex-col gap-0.5 border-t border-border pt-3">
                <span className="text-xs font-medium text-muted-foreground">
                  {cs.notes}
                </span>
                <span className="whitespace-pre-wrap text-sm">
                  {r.reflectionNotes}
                </span>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function PairRow({
  label,
  athlete,
  coach,
}: {
  label: string;
  athlete: string | null;
  coach: string | null;
}) {
  return (
    <div className="grid gap-1 sm:grid-cols-[8rem_1fr_1fr] sm:items-start sm:gap-2">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="whitespace-pre-wrap text-sm">{athlete ?? "—"}</span>
      <span className="whitespace-pre-wrap text-sm">{coach ?? "—"}</span>
    </div>
  );
}

function entryField(entry: CompetitionEntry, key: string): string | null {
  const v = (entry as Record<string, unknown>)[key];
  return typeof v === "string" && v !== "" ? v : null;
}

function reflectionField(
  r: NonNullable<MeetingCompetition["reflection"]>,
  key: string,
): string | null {
  const map: Record<string, string | null> = {
    before: r.reflectionBefore,
    performance: r.reflectionPerformance,
    improvement: r.reflectionImprovement,
    lesson: r.reflectionLesson,
  };
  const v = map[key];
  return v && v !== "" ? v : null;
}
