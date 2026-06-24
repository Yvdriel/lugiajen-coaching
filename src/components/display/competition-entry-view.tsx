import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { ENTRY_ROUNDS } from "@/features/competitions/schema";
import { getMessages } from "@/i18n/server";
import type { CompetitionEntry } from "@/lib/queries/competitions";

/**
 * Pure presentational pieces of a competition entry (convention 3), shared by the
 * competition detail (`competition-entries`) and the athlete Wedstrijden tab
 * (`athlete-competitions`). No session, no actions, no links.
 */

function Row({
  label,
  value,
}: {
  label: string;
  value: string | number | null;
}) {
  if (value === null || value === "") return null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="whitespace-pre-wrap text-sm">{value}</span>
    </div>
  );
}

export async function ResultBadges({ entry }: { entry: CompetitionEntry }) {
  const nl = await getMessages();
  const c = nl.competition;
  if (entry.resultPlacement == null && !entry.resultRoundReached) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      {entry.resultPlacement != null ? (
        <Badge variant="secondary">
          {c.entry.placement}: {entry.resultPlacement}e
        </Badge>
      ) : null}
      {entry.resultRoundReached ? (
        <span className="text-muted-foreground">{entry.resultRoundReached}</span>
      ) : null}
    </div>
  );
}

export async function RoundList({
  entry,
  kataNames,
}: {
  entry: CompetitionEntry;
  kataNames: Map<string, string>;
}) {
  const nl = await getMessages();
  const c = nl.competition;
  const rounds = ENTRY_ROUNDS.map((r) => {
    const kataId = entry[r.kata];
    if (!kataId) return null;
    const result = entry[r.result];
    return (
      <li key={r.kata} className="flex flex-wrap items-center gap-2 text-sm">
        <span className="w-20 shrink-0 text-xs font-medium text-muted-foreground">
          {c.rounds[r.labelKey]}
        </span>
        <span>{kataNames.get(kataId) ?? "?"}</span>
        {result ? (
          <Badge variant="outline">{c.result[result]}</Badge>
        ) : null}
      </li>
    );
  }).filter(Boolean);

  if (rounds.length === 0) return null;
  return <ul className="flex flex-col gap-1">{rounds}</ul>;
}

export async function EntryFeedback({
  entry,
  mode = "coach",
  revealCoachFeedback = true,
}: {
  entry: CompetitionEntry;
  mode?: "coach" | "public";
  // Public surfaces only reveal the coach's per-entry feedback once a completed
  // meeting has covered the competition (the reveal happens at the parent meeting).
  // Always revealed for the coach.
  revealCoachFeedback?: boolean;
}) {
  const nl = await getMessages();
  const e = nl.competition.entry;
  const showFeedback = mode === "coach" || revealCoachFeedback;
  // coachNotes is coach-private — never shown in the public portal (convention 3).
  const showCoachNotes = mode === "coach" && Boolean(entry.coachNotes);
  const hasAny =
    (showFeedback &&
      (entry.feedbackBefore ||
        entry.feedbackPerformance ||
        entry.feedbackImprovement ||
        entry.feedbackLesson)) ||
    showCoachNotes;
  if (!hasAny) return null;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {showFeedback ? (
        <>
          <Row label={e.feedbackBefore} value={entry.feedbackBefore} />
          <Row label={e.feedbackPerformance} value={entry.feedbackPerformance} />
          <Row label={e.feedbackImprovement} value={entry.feedbackImprovement} />
          <Row label={e.feedbackLesson} value={entry.feedbackLesson} />
        </>
      ) : null}
      {showCoachNotes ? (
        <Row label={e.coachNotes} value={entry.coachNotes} />
      ) : null}
    </div>
  );
}

/** Wraps the per-entry body (result + rounds + feedback) with an optional actions slot. */
export function EntryBody({
  entry,
  kataNames,
  actions,
  mode = "coach",
  revealCoachFeedback = true,
}: {
  entry: CompetitionEntry;
  kataNames: Map<string, string>;
  actions?: ReactNode;
  mode?: "coach" | "public";
  revealCoachFeedback?: boolean;
}) {
  return (
    <div className="flex flex-col gap-3">
      <ResultBadges entry={entry} />
      <RoundList entry={entry} kataNames={kataNames} />
      <EntryFeedback
        entry={entry}
        mode={mode}
        revealCoachFeedback={revealCoachFeedback}
      />
      {actions ? <div className="flex gap-1">{actions}</div> : null}
    </div>
  );
}
