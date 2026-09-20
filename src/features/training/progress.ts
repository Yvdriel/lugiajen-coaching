import type { ScoringCardRow } from "@/lib/queries/scoring";
import type { PlanWeekRow, SessionRow } from "@/lib/queries/training";
import {
  addDays,
  blockLoad,
  blockVolume,
  effectiveReps,
  isKataBlock,
  isSessionDone,
  sessionVli,
  vliPerKata,
  weekStartOf,
  type Vli,
} from "./vli";

// Pure assemblers over already-loaded rows (convention 4). Both take `today` so
// "done" is deterministic in tests.

export type WeekVli = {
  weekStart: string;
  sessionsDone: number;
  sessionsSkipped: number;
  sessionsPlanned: number;
  total: Vli;
  perKata: Record<string, Vli>; // kataId → Vli, done sessions only
  target: {
    targetLoad: number;
    targetIntensity: number;
    character: string;
  } | null;
};

/** One entry per ISO week from `from` to `to` (inclusive), empty weeks included. */
export function weeklyVli(args: {
  sessions: SessionRow[];
  planWeeks: PlanWeekRow[];
  today: string;
  from: string;
  to: string;
}): WeekVli[] {
  const targets = new Map(args.planWeeks.map((w) => [w.weekStart, w]));
  const out: WeekVli[] = [];
  const last = weekStartOf(args.to);
  for (let ws = weekStartOf(args.from); ws <= last; ws = addDays(ws, 7)) {
    const weekEnd = addDays(ws, 6);
    const inWeek = args.sessions.filter(
      (s) => s.date >= ws && s.date <= weekEnd,
    );
    const done = inWeek.filter((s) => isSessionDone(s, args.today));
    const doneBlocks = done.flatMap((s) => s.blocks);
    const t = targets.get(ws);
    out.push({
      weekStart: ws,
      sessionsDone: done.length,
      sessionsSkipped: inWeek.filter((s) => s.skippedAt != null).length,
      sessionsPlanned: inWeek.filter(
        (s) => s.skippedAt == null && s.date > args.today,
      ).length,
      total: sessionVli(doneBlocks),
      perKata: Object.fromEntries(vliPerKata(doneBlocks)),
      target: t
        ? {
            targetLoad: t.targetLoad,
            targetIntensity: t.targetIntensity,
            character: t.character,
          }
        : null,
    });
  }
  return out;
}

export type KataSince = {
  volume: number;
  load: number;
  sessions: number;
  perSection: Record<string, number>; // "quarter:2" → volume
};

export type KataProgressPoint = {
  cardId: string;
  assessmentDate: string;
  overallImpression: number;
  delta: number | null;
  since: KataSince;
};

export type KataProgress = {
  kataId: string;
  points: KataProgressPoint[];
  sinceLastCard: KataSince;
};

function emptySince(): KataSince {
  return { volume: 0, load: 0, sessions: 0, perSection: {} };
}

function accumulate(sessions: SessionRow[], kataId: string): KataSince {
  const out = emptySince();
  for (const s of sessions) {
    let touched = false;
    for (const b of s.blocks) {
      if (!isKataBlock(b) || b.kataId !== kataId || b.skipped) continue;
      touched = true;
      out.volume += blockVolume(b);
      out.load += blockLoad(b);
      const perSection = effectiveReps(b) * b.rounds;
      for (const idx of b.sections) {
        const key = `${b.split}:${idx}`;
        out.perSection[key] = (out.perSection[key] ?? 0) + perSection;
      }
    }
    if (touched) out.sessions += 1;
  }
  out.load = Math.round(out.load * 100) / 100;
  return out;
}

/**
 * For one kata: each scoring card with the VLI done between the previous card and
 * it (window (prev, card]), plus everything done since the latest card.
 * `cards` oldest → newest.
 */
export function kataProgress(args: {
  kataId: string;
  cards: ScoringCardRow[];
  sessions: SessionRow[];
  today: string;
}): KataProgress {
  const done = args.sessions.filter((s) => isSessionDone(s, args.today));
  const points: KataProgressPoint[] = [];
  let prevDate: string | null = null;
  let prevOverall: number | null = null;
  for (const c of args.cards) {
    const window = done.filter(
      (s) =>
        (prevDate == null || s.date > prevDate) && s.date <= c.assessmentDate,
    );
    points.push({
      cardId: c.id,
      assessmentDate: c.assessmentDate,
      overallImpression: c.overallImpression,
      delta: prevOverall == null ? null : c.overallImpression - prevOverall,
      since: accumulate(window, args.kataId),
    });
    prevDate = c.assessmentDate;
    prevOverall = c.overallImpression;
  }
  const tail = done.filter((s) => prevDate == null || s.date > prevDate);
  return {
    kataId: args.kataId,
    points,
    sinceLastCard: accumulate(tail, args.kataId),
  };
}
