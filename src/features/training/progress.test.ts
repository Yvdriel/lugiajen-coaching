import { describe, expect, it } from "vitest";
import type { ScoringCardRow } from "@/lib/queries/scoring";
import type { BlockRow, PlanWeekRow, SessionRow } from "@/lib/queries/training";
import { kataProgress, weeklyVli } from "./progress";

const block = (o: Partial<BlockRow>): BlockRow =>
  ({
    id: "b",
    sessionId: "s",
    part: 5,
    sortOrder: 0,
    kataId: "enpi",
    kataName: "Enpi",
    label: null,
    split: "quarter",
    sections: [1, 2, 3, 4],
    reps: 5,
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

const session = (o: Partial<SessionRow>): SessionRow =>
  ({
    id: "s",
    athleteId: "a",
    planId: null,
    date: "2026-09-15",
    title: null,
    notes: null,
    coachNotes: null,
    skippedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    blocks: [block({})],
    ...o,
  }) as SessionRow;

const card = (o: Partial<ScoringCardRow>): ScoringCardRow =>
  ({
    id: "c",
    athleteId: "a",
    kataId: "enpi",
    assessmentDate: "2026-09-01",
    overallImpression: 60,
    createdAt: new Date(),
    ...o,
  }) as ScoringCardRow;

describe("weeklyVli", () => {
  const weeks: PlanWeekRow[] = [
    {
      id: "w",
      planId: "p",
      weekStart: "2026-09-14",
      targetLoad: 8,
      targetIntensity: 3,
      character: "Building",
    },
  ];

  it("buckets done, skipped and planned sessions per ISO week with targets", () => {
    const out = weeklyVli({
      sessions: [
        session({ id: "1", date: "2026-09-14" }), // done, vol 20 load 5
        session({ id: "2", date: "2026-09-16", skippedAt: new Date() }),
        session({ id: "3", date: "2026-09-19" }), // future (today 09-18)
        session({
          id: "4",
          date: "2026-09-08",
          blocks: [
            block({
              kataId: "unsu",
              split: "third",
              sections: [1, 2, 3],
              reps: 2,
            }),
          ],
        }),
      ],
      planWeeks: weeks,
      today: "2026-09-18",
      from: "2026-09-07",
      to: "2026-09-20",
    });
    expect(out.map((w) => w.weekStart)).toEqual(["2026-09-07", "2026-09-14"]);
    const [w1, w2] = out;
    expect(w1.total).toEqual({ volume: 6, load: 2, intensity: 2.5 });
    expect(w1.target).toBeNull();
    expect(w2.sessionsDone).toBe(1);
    expect(w2.sessionsSkipped).toBe(1);
    expect(w2.sessionsPlanned).toBe(1);
    expect(w2.total.load).toBe(5);
    expect(w2.perKata.enpi.volume).toBe(20);
    expect(w2.target?.targetLoad).toBe(8);
  });

  it("emits empty weeks", () => {
    const out = weeklyVli({
      sessions: [],
      planWeeks: [],
      today: "2026-09-18",
      from: "2026-09-01",
      to: "2026-09-18",
    });
    expect(out).toHaveLength(3);
    expect(out[0].total.volume).toBe(0);
  });
});

describe("kataProgress", () => {
  it("accumulates VLI between consecutive cards and since the last one", () => {
    const out = kataProgress({
      kataId: "enpi",
      cards: [
        card({ id: "c1", assessmentDate: "2026-09-01", overallImpression: 60 }),
        card({ id: "c2", assessmentDate: "2026-09-15", overallImpression: 65 }),
      ],
      sessions: [
        session({
          id: "s1",
          date: "2026-09-05",
          blocks: [block({ sections: [1, 2], reps: 5 })],
        }),
        session({
          id: "s2",
          date: "2026-09-20",
          blocks: [block({ split: "third", sections: [3], reps: 4 })],
        }),
        session({ id: "s3", date: "2026-09-21", skippedAt: new Date() }),
        session({
          id: "s4",
          date: "2026-09-10",
          blocks: [block({ kataId: "unsu" })],
        }),
      ],
      today: "2026-09-22",
    });
    expect(out.points).toHaveLength(2);
    expect(out.points[0].since).toEqual({
      volume: 0,
      load: 0,
      sessions: 0,
      perSection: {},
    });
    expect(out.points[0].delta).toBeNull();
    expect(out.points[1].delta).toBe(5);
    expect(out.points[1].since.volume).toBe(10);
    expect(out.points[1].since.load).toBe(2.5);
    expect(out.points[1].since.sessions).toBe(1);
    expect(out.points[1].since.perSection).toEqual({
      "quarter:1": 5,
      "quarter:2": 5,
    });
    expect(out.sinceLastCard).toEqual({
      volume: 4,
      load: 1.33,
      sessions: 1,
      perSection: { "third:3": 4 },
    });
  });

  it("with no cards everything lands in sinceLastCard", () => {
    const out = kataProgress({
      kataId: "enpi",
      cards: [],
      sessions: [session({ date: "2026-09-05" })],
      today: "2026-09-22",
    });
    expect(out.points).toEqual([]);
    expect(out.sinceLastCard.volume).toBe(20);
  });
});
