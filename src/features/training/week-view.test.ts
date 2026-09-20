import { describe, expect, it } from "vitest";
import type { SessionWithVli } from "./context";
import type { BlockRow, PlanRow } from "@/lib/queries/training";
import {
  buildWeekGrid,
  cellSummary,
  defaultDay,
  groupByMonth,
  mainKata,
  planWeekOf,
  repsLabel,
  sectionsArrow,
} from "./week-view";

const block = (o: Partial<BlockRow>): BlockRow =>
  ({
    id: "b",
    sessionId: "s",
    part: 5,
    sortOrder: 0,
    kataId: "k",
    kataName: "Enpi",
    label: null,
    split: "third",
    sections: [1, 2, 3],
    reps: 10,
    restRepSec: 30,
    restSectionSec: 120,
    rounds: 1,
    format: "technical",
    vest: false,
    minutes: null,
    skipped: false,
    actualReps: null,
    notes: null,
    coachNotes: null,
    ...o,
  }) as BlockRow;

const session = (o: Partial<SessionWithVli>): SessionWithVli =>
  ({
    id: "s",
    date: "2026-09-21",
    skippedAt: null,
    blocks: [],
    ...o,
  }) as unknown as SessionWithVli;

describe("buildWeekGrid", () => {
  it("always seven days, parts = sorted unique parts present", () => {
    const g = buildWeekGrid(
      [
        session({ id: "a", date: "2026-09-23", blocks: [block({ part: 5 }), block({ part: 2, kataId: null, label: "S&C" })] }),
        session({ id: "b", date: "2026-09-21", blocks: [block({ part: 6 })] }),
      ],
      "2026-09-21",
    );
    expect(g.days).toHaveLength(7);
    expect(g.days[0]).toMatchObject({ date: "2026-09-21", weekday: 1 });
    expect(g.days[6]).toMatchObject({ date: "2026-09-27", weekday: 7 });
    expect(g.days[2].sessions.map((s) => s.id)).toEqual(["a"]);
    expect(g.parts).toEqual([2, 5, 6]);
  });
});

describe("mainKata", () => {
  it("prefers the part-5 kata block, else the first kata block", () => {
    expect(
      mainKata(session({ blocks: [block({ part: 4, kataName: "Sochin" }), block({ part: 5, kataName: "Enpi" })] })),
    ).toBe("Enpi");
    expect(mainKata(session({ blocks: [block({ part: 6, kataName: "Gankaku" })] }))).toBe("Gankaku");
    expect(mainKata(session({ blocks: [block({ kataId: null, kataName: null, label: "S&C" })] }))).toBeNull();
  });
});

describe("planWeekOf", () => {
  const plan = {
    weeks: [
      { weekStart: "2026-09-14", character: "Loading" },
      { weekStart: "2026-09-21", character: "Development" },
    ],
  } as PlanRow;
  it("1-based index by sorted week start", () => {
    expect(planWeekOf(plan, "2026-09-21")).toEqual({ index: 2, character: "Development" });
    expect(planWeekOf(plan, "2026-10-05")).toBeNull();
    expect(planWeekOf(null, "2026-09-21")).toBeNull();
  });
});

describe("labels", () => {
  it("cellSummary", () => {
    expect(cellSummary(block({}))).toBe("×10 / third");
    expect(cellSummary(block({ rounds: 7 }))).toBe("7 rondes");
    expect(cellSummary(block({ kataId: null, minutes: 20 }))).toBe("20 min");
  });
  it("sectionsArrow and repsLabel", () => {
    expect(sectionsArrow(block({}))).toBe("1/3 → 2/3 → 3/3");
    expect(sectionsArrow(block({ split: "quarter", sections: [2, 4] }))).toBe("2/4 → 4/4");
    expect(repsLabel(block({}))).toBe("×10");
    expect(repsLabel(block({ actualReps: 8 }))).toBe("8/10");
  });
});

describe("groupByMonth", () => {
  it("keeps order, groups by YYYY-MM", () => {
    const g = groupByMonth([
      session({ id: "a", date: "2026-09-30" }),
      session({ id: "b", date: "2026-10-01" }),
      session({ id: "c", date: "2026-10-15" }),
    ]);
    expect(g.map((m) => [m.month, m.sessions.length])).toEqual([["2026-09", 1], ["2026-10", 2]]);
  });
});

describe("defaultDay", () => {
  const grid = buildWeekGrid(
    [session({ date: "2026-09-22" }), session({ date: "2026-09-25" })],
    "2026-09-21",
  );
  it("today when in week with session, else first day with sessions, else today in week, else Monday", () => {
    expect(defaultDay(grid, "2026-09-25")).toBe(5);
    expect(defaultDay(grid, "2026-09-23")).toBe(2);
    expect(defaultDay(grid, "2026-10-10")).toBe(2);
    const empty = buildWeekGrid([], "2026-09-21");
    expect(defaultDay(empty, "2026-09-24")).toBe(4);
    expect(defaultDay(empty, "2026-10-10")).toBe(1);
  });
});
