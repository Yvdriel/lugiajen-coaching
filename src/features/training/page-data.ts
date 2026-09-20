import type { AthleteKataItem } from "@/lib/queries/kata";
import { getAthleteKata, getKataLibrary } from "@/lib/queries/kata";
import { getScoringHistory, type ScoringCardRow } from "@/lib/queries/scoring";
import {
  getActivePlan,
  getTimingLookup,
  listSessions,
  listTimings,
  type PlanRow,
  type TimingRow,
} from "@/lib/queries/training";
import { type SessionWithVli, withVli } from "./context";
import { weeklyVli, type WeekVli } from "./progress";
import { allowedSplits } from "./schema";
import { addDays, todayIso, type Split, weekStartOf } from "./vli";
import {
  buildWeekGrid,
  groupByMonth,
  mainKata,
  planWeekOf,
  type WeekGrid,
} from "./week-view";

// One loader for the coach and portal training pages; both render the same
// components, so both read the same shape (convention 4).

export type TrainingView = "week" | "agenda" | "progress";
const VIEWS: TrainingView[] = ["week", "agenda", "progress"];
const ISO = /^\d{4}-\d{2}-\d{2}$/;

export type MonthGroup = { month: string; sessions: SessionWithVli[] };

export type KataProgressData = {
  kataId: string;
  kataName: string;
  weeks: { weekStart: string; load: number }[]; // this kata only, done sessions
  cards: ScoringCardRow[]; // oldest → newest
};

export type TrainingPageData = {
  today: string;
  view: TrainingView;
  weekStart: string;
  plan: PlanRow | null;
  planWeek: { index: number; character: string } | null;
  grid: WeekGrid;
  strip: WeekVli[];
  agenda: { upcoming: MonthGroup[]; past: MonthGroup[] } | null;
  progress: {
    kata: KataProgressData[];
    timings: TimingRow[];
    repertoire: (AthleteKataItem & { splits: Split[] })[];
  } | null;
};

export function parseView(v: string | undefined): TrainingView {
  return VIEWS.includes(v as TrainingView) ? (v as TrainingView) : "week";
}

export async function loadTrainingPage(
  athleteId: string,
  q: { view?: string; week?: string },
): Promise<TrainingPageData> {
  const today = todayIso();
  const view = parseView(q.view);
  const weekStart = weekStartOf(q.week && ISO.test(q.week) ? q.week : today);

  const [plan, timing] = await Promise.all([
    getActivePlan(athleteId, weekStart),
    getTimingLookup(athleteId),
  ]);

  // Strip: six weeks back up to the later of this week and the plan's end.
  const stripFrom = addDays(weekStart, -42);
  const stripTo = addDays(
    plan && plan.endDate > weekStart ? weekStartOf(plan.endDate) : weekStart,
    6,
  );
  const sessions = (await listSessions(athleteId, stripFrom, stripTo)).map(
    (s) => withVli(s, timing, today),
  );
  const strip = weeklyVli({
    sessions,
    planWeeks: plan?.weeks ?? [],
    today,
    from: stripFrom,
    to: stripTo,
  });
  const grid = buildWeekGrid(
    sessions.filter((s) => weekStartOf(s.date) === weekStart),
    weekStart,
  );

  const base: TrainingPageData = {
    today,
    view,
    weekStart,
    plan,
    planWeek: planWeekOf(plan, weekStart),
    grid,
    strip,
    agenda: null,
    progress: null,
  };

  if (view === "agenda") {
    const all = (
      await listSessions(athleteId, addDays(today, -182), addDays(today, 365))
    ).map((s) => withVli(s, timing, today));
    base.agenda = {
      upcoming: groupByMonth(all.filter((s) => s.date >= today)),
      past: groupByMonth(all.filter((s) => s.date < today).reverse()),
    };
  }

  if (view === "progress") {
    const [repertoire, lib, timings, history] = await Promise.all([
      getAthleteKata(athleteId),
      getKataLibrary(),
      listTimings(athleteId),
      listSessions(athleteId, "2000-01-01", today),
    ]);
    const libById = new Map(lib.map((k) => [k.id, k]));
    const first = history[0]?.date ?? today;
    const weeks = weeklyVli({
      sessions: history,
      planWeeks: [],
      today,
      from: first,
      to: today,
    });
    const cards = await Promise.all(
      repertoire.map((r) => getScoringHistory(athleteId, r.kataId)),
    );
    base.progress = {
      kata: repertoire.map((r, i) => ({
        kataId: r.kataId,
        kataName: r.kataName,
        weeks: weeks.map((w) => ({
          weekStart: w.weekStart,
          load: w.perKata[r.kataId]?.load ?? 0,
        })),
        cards: [...cards[i]].reverse(),
      })),
      timings,
      repertoire: repertoire.map((r) => ({
        ...r,
        splits: allowedSplits(libById.get(r.kataId)!),
      })),
    };
  }

  return base;
}

export type TrainingSummary = {
  week: WeekVli;
  next: { id: string; date: string; kata: string | null; title: string | null } | null;
};

/** For the athlete tab card: this week's numbers and the next session. */
export async function getTrainingSummary(
  athleteId: string,
): Promise<TrainingSummary> {
  const today = todayIso();
  const ws = weekStartOf(today);
  const [plan, sessions] = await Promise.all([
    getActivePlan(athleteId, today),
    listSessions(athleteId, ws, addDays(today, 60)),
  ]);
  const [week] = weeklyVli({
    sessions,
    planWeeks: plan?.weeks ?? [],
    today,
    from: ws,
    to: addDays(ws, 6),
  });
  const n = sessions.find((s) => s.date >= today && s.skippedAt == null);
  return {
    week,
    next: n ? { id: n.id, date: n.date, kata: mainKata(n), title: n.title } : null,
  };
}
