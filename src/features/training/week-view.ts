import type { BlockRow, PlanRow, SessionRow } from "@/lib/queries/training";
import type { SessionWithVli } from "./context";
import { addDays, isKataBlock, SPLIT_SIZE, weekStartOf } from "./vli";

// Pure helpers behind the week grid, agenda and day headers. No React, no DB.

export type DayColumn = {
  date: string;
  weekday: number; // ISO 1 = Monday .. 7 = Sunday
  sessions: SessionWithVli[];
};

export type WeekGrid = {
  weekStart: string;
  days: DayColumn[]; // always 7
  parts: number[]; // sorted, only parts present somewhere this week
};

export function buildWeekGrid(
  sessions: SessionWithVli[],
  weekStart: string,
): WeekGrid {
  const days: DayColumn[] = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(weekStart, i);
    return {
      date,
      weekday: i + 1,
      sessions: sessions.filter((s) => s.date === date),
    };
  });
  const parts = [
    ...new Set(sessions.flatMap((s) => s.blocks.map((b) => b.part))),
  ].sort((a, b) => a - b);
  return { weekStart, days, parts };
}

/** Kata of the technical block (part 5); falls back to the first kata block. */
export function mainKata(s: SessionRow): string | null {
  const kata = s.blocks.filter((b) => isKataBlock(b));
  return (kata.find((b) => b.part === 5) ?? kata[0])?.kataName ?? null;
}

export function planWeekOf(
  plan: PlanRow | null,
  weekStart: string,
): { index: number; character: string } | null {
  if (!plan) return null;
  const sorted = [...plan.weeks].sort((a, b) =>
    a.weekStart < b.weekStart ? -1 : 1,
  );
  const i = sorted.findIndex((w) => w.weekStart === weekStart);
  return i === -1 ? null : { index: i + 1, character: sorted[i].character };
}

/** Top-right corner of a grid cell: "×10 / third", "7 rondes" or "20 min". */
export function cellSummary(b: BlockRow): string {
  if (!isKataBlock(b)) return b.minutes == null ? "" : `${b.minutes} min`;
  if (b.rounds > 1) return `${b.rounds} rondes`;
  return `${repsLabel(b)} / ${b.split}`;
}

export function sectionsArrow(b: BlockRow): string {
  if (!b.split || !b.sections) return "";
  const size = SPLIT_SIZE[b.split];
  return b.sections.map((i) => `${i}/${size}`).join(" → ");
}

export function repsLabel(b: BlockRow): string {
  if (b.reps == null) return "";
  return b.actualReps == null ? `×${b.reps}` : `${b.actualReps}/${b.reps}`;
}

export function groupByMonth(
  sessions: SessionWithVli[],
): { month: string; sessions: SessionWithVli[] }[] {
  const out: { month: string; sessions: SessionWithVli[] }[] = [];
  for (const s of sessions) {
    const month = s.date.slice(0, 7);
    const last = out[out.length - 1];
    if (last?.month === month) last.sessions.push(s);
    else out.push({ month, sessions: [s] });
  }
  return out;
}

/** Weekday to open on mobile. */
export function defaultDay(grid: WeekGrid, today: string): number {
  const inWeek = weekStartOf(today) === grid.weekStart;
  const todayCol = inWeek ? grid.days.find((d) => d.date === today) : undefined;
  if (todayCol?.sessions.length) return todayCol.weekday;
  const first = grid.days.find((d) => d.sessions.length > 0);
  if (first) return first.weekday;
  return todayCol?.weekday ?? 1;
}
