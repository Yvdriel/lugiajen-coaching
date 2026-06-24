import { entryKataNames } from "@/features/competitions/entry";
import {
  type CompetitionType,
  ENTRY_ROUNDS,
} from "@/features/competitions/schema";
import {
  type CompetitionSummary,
  summarizeAthleteCompetitions,
} from "@/features/competitions/summary";
import type { AthleteCompetitionRow } from "@/lib/queries/competitions";
import type { FeedbackRow } from "@/lib/queries/feedback";
import type { AthleteKataItem } from "@/lib/queries/kata";
import type { ScoringCardRow } from "@/lib/queries/scoring";

// Pure assembly of the Overzicht-tab stats (convention 4 — assembles, never re-queries).
// All inputs are rows the profile page already loads; reused read-only by Ch10's portal.

export type RoundKey = (typeof ENTRY_ROUNDS)[number]["labelKey"];
export type RoundTally = { labelKey: RoundKey; wins: number; losses: number };

export type AthleteStats = {
  competition: CompetitionSummary & {
    byType: { type: CompetitionType; count: number }[];
    rounds: RoundTally[];
  };
  repertoire: {
    kataName: string;
    proficiency: number | null; // derived from latest card's overall; null = no card yet
    roundOrder: number | null;
  }[];
  goals: {
    goalMain?: string;
    goalPerformance?: string;
    goalOutcome?: string;
    kataFocus?: string;
  } | null;
  focusPoints: string[];
};

const TYPE_ORDER: CompetitionType[] = [
  "club",
  "regional",
  "national",
  "international",
];

/** Count of competition entries per competition type, in canonical type order. */
export function competitionsByType(
  rows: AthleteCompetitionRow[],
): { type: CompetitionType; count: number }[] {
  const counts = new Map<CompetitionType, number>();
  for (const r of rows) {
    counts.set(r.competitionType, (counts.get(r.competitionType) ?? 0) + 1);
  }
  return TYPE_ORDER.filter((t) => counts.has(t)).map((type) => ({
    type,
    count: counts.get(type) ?? 0,
  }));
}

/** Win/loss tally across the five round-result columns; rounds with no result dropped. */
export function winLossPerRound(rows: AthleteCompetitionRow[]): RoundTally[] {
  return ENTRY_ROUNDS.map((r) => {
    let wins = 0;
    let losses = 0;
    for (const row of rows) {
      const res = (row.entry as Record<string, unknown>)[r.result];
      if (res === "win") wins++;
      else if (res === "loss") losses++;
    }
    return { labelKey: r.labelKey, wins, losses };
  }).filter((t) => t.wins > 0 || t.losses > 0);
}

/** First non-empty, trimmed, deduplicated. */
function collect(...vals: (string | null | undefined)[]): string[] {
  const out: string[] = [];
  for (const v of vals) {
    const s = v?.trim();
    if (s && !out.includes(s)) out.push(s);
  }
  return out;
}

function cleanGoals(latest: FeedbackRow): AthleteStats["goals"] {
  const out: NonNullable<AthleteStats["goals"]> = {};
  if (latest.goalMain?.trim()) out.goalMain = latest.goalMain.trim();
  if (latest.goalPerformance?.trim())
    out.goalPerformance = latest.goalPerformance.trim();
  if (latest.goalOutcome?.trim()) out.goalOutcome = latest.goalOutcome.trim();
  if (latest.kataFocus?.trim()) out.kataFocus = latest.kataFocus.trim();
  return Object.keys(out).length > 0 ? out : null;
}

export type AthleteStatsInput = {
  competitions: AthleteCompetitionRow[];
  repertoire: AthleteKataItem[];
  latestCards: ScoringCardRow[];
  feedback: FeedbackRow[]; // newest meeting first
  kataNames: Map<string, string>;
  // Action-item texts of the latest meeting (action items are rows now, not columns).
  latestActions?: string[];
};

export function buildAthleteStats({
  competitions,
  repertoire,
  latestCards,
  feedback,
  kataNames,
  latestActions = [],
}: AthleteStatsInput): AthleteStats {
  const summary = summarizeAthleteCompetitions(
    competitions.map((r) => ({
      placement: r.entry.resultPlacement,
      katas: entryKataNames(r.entry, kataNames),
    })),
  );

  // Kata level = latest card's (derived) overall impression; no card → null.
  const profByKata = new Map(
    latestCards.map((c) => [c.kataId, c.overallImpression]),
  );
  const compRepertoire = repertoire
    .filter((k) => k.isCompetitionKata)
    .map((k) => ({
      kataName: k.kataName,
      proficiency: profByKata.get(k.kataId) ?? null,
      roundOrder: k.roundOrder,
    }));

  const latest = feedback[0] ?? null;

  // Current focus points: latest feedback (coach development + actions) then the
  // latest scoring cards' priority improvements; feedback-first, deduped.
  const focusPoints = collect(
    latest?.coachDevelopmentArea,
    ...latestActions,
    ...latestCards.map((c) => c.priorityImprovements),
  );

  return {
    competition: {
      ...summary,
      byType: competitionsByType(competitions),
      rounds: winLossPerRound(competitions),
    },
    repertoire: compRepertoire,
    goals: latest ? cleanGoals(latest) : null,
    focusPoints,
  };
}
