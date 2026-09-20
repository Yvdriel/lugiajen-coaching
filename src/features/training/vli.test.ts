import { describe, expect, it } from "vitest";
import {
  blockDurationSec,
  blockIntensity,
  blockLoad,
  blockVolume,
  isSessionDone,
  sessionDurationSec,
  sessionVli,
  vliPerKata,
  weekStartOf,
  type VliBlock,
} from "./vli";

const kb = (o: Partial<VliBlock> = {}): VliBlock => ({
  kataId: "enpi",
  split: "third",
  sections: [1, 2, 3],
  reps: 10,
  restRepSec: 30,
  restSectionSec: 120,
  rounds: 1,
  minutes: null,
  skipped: false,
  actualReps: null,
  ...o,
});

describe("volume and load", () => {
  it("EP.2 week 1: 4 quarters × 5 = volume 20, load 5", () => {
    const b = kb({ split: "quarter", sections: [1, 2, 3, 4], reps: 5 });
    expect(blockVolume(b)).toBe(20);
    expect(blockLoad(b)).toBe(5);
  });

  it("subset of sections scales load by fraction", () => {
    const b = kb({ split: "quarter", sections: [3], reps: 8 });
    expect(blockVolume(b)).toBe(8);
    expect(blockLoad(b)).toBe(2);
  });

  it("rounds multiply", () => {
    const b = kb({ split: "third", sections: [1, 2, 3], reps: 1, rounds: 5 });
    expect(blockVolume(b)).toBe(15);
    expect(blockLoad(b)).toBe(5);
  });

  it("actualReps overrides reps; skipped block contributes nothing", () => {
    expect(blockVolume(kb({ reps: 10, actualReps: 6 }))).toBe(18);
    expect(sessionVli([kb({ skipped: true })]).volume).toBe(0);
  });

  it("non-kata block is ignored", () => {
    expect(
      blockVolume(
        kb({ kataId: null, split: null, sections: null, minutes: 20 }),
      ),
    ).toBe(0);
  });
});

describe("intensity", () => {
  it("quarter, 30s rest = 1.5", () => {
    expect(blockIntensity(kb({ split: "quarter", restRepSec: 30 }))).toBe(1.5);
  });

  it("quarter, 60s rest = 1", () => {
    expect(blockIntensity(kb({ split: "quarter", restRepSec: 60 }))).toBe(1);
  });

  it("full, no rest caps at 5", () => {
    expect(
      blockIntensity(kb({ split: "full", sections: [1], restRepSec: 0 })),
    ).toBe(5);
  });

  it("session = volume-weighted mean rounded to 0.5", () => {
    const s = sessionVli([
      kb({ split: "quarter", sections: [1, 2, 3, 4], reps: 5, restRepSec: 30 }), // vol 20, int 1.5
      kb({ split: "half", sections: [1, 2], reps: 3, restRepSec: 60 }), // vol 6, int 4
    ]);
    expect(s.volume).toBe(26);
    expect(s.load).toBe(8);
    expect(s.intensity).toBe(2); // (20*1.5 + 6*4)/26 = 2.08 → 2
  });

  it("no kata blocks → null intensity", () => {
    expect(
      sessionVli([kb({ kataId: null, split: null, sections: null })]).intensity,
    ).toBeNull();
  });
});

describe("per kata", () => {
  it("groups by kataId", () => {
    const m = vliPerKata([
      kb({ kataId: "a", reps: 2 }),
      kb({ kataId: "b", reps: 1 }),
      kb({ kataId: "a", reps: 1 }),
    ]);
    expect(m.get("a")?.volume).toBe(9);
    expect(m.get("b")?.volume).toBe(3);
  });
});

describe("duration", () => {
  const timing = (_kataId: string, _split: string, i: number) =>
    i === 3 ? null : 20;

  it("sums reps, rest between reps, rest between sections and rounds", () => {
    const b = kb({
      sections: [1, 2],
      reps: 2,
      restRepSec: 30,
      restSectionSec: 60,
      rounds: 2,
    });
    // per round: 2 sections × (2×20 + 1×30) = 140, + 1×60 between sections = 200;
    // ×2 rounds = 400, + 60 between rounds = 460
    expect(blockDurationSec(b, timing)).toEqual({ seconds: 460, missing: [] });
  });

  it("reports missing timing and returns null seconds", () => {
    const r = blockDurationSec(kb({ sections: [3], reps: 1 }), timing);
    expect(r.seconds).toBeNull();
    expect(r.missing).toEqual([{ kataId: "enpi", split: "third", index: 3 }]);
  });

  it("non-kata block uses minutes", () => {
    expect(
      blockDurationSec(
        kb({ kataId: null, split: null, sections: null, minutes: 15 }),
        timing,
      ).seconds,
    ).toBe(900);
  });

  it("session sums blocks and collects missing timings", () => {
    const r = sessionDurationSec(
      [
        kb({ kataId: null, split: null, sections: null, minutes: 10 }),
        kb({ sections: [1], reps: 1, restRepSec: 0, restSectionSec: 0 }),
      ],
      timing,
    );
    expect(r).toEqual({ seconds: 620, missing: [] });
    const r2 = sessionDurationSec([kb({ sections: [3], reps: 1 })], timing);
    expect(r2.seconds).toBeNull();
    expect(r2.missing).toHaveLength(1);
  });
});

describe("done and weeks", () => {
  it("done when date passed and not skipped", () => {
    expect(
      isSessionDone({ date: "2026-09-17", skippedAt: null }, "2026-09-18"),
    ).toBe(true);
    expect(
      isSessionDone({ date: "2026-09-18", skippedAt: null }, "2026-09-18"),
    ).toBe(true);
    expect(
      isSessionDone({ date: "2026-09-19", skippedAt: null }, "2026-09-18"),
    ).toBe(false);
    expect(
      isSessionDone(
        { date: "2026-09-17", skippedAt: new Date() },
        "2026-09-18",
      ),
    ).toBe(false);
  });

  it("weekStartOf returns the Monday", () => {
    expect(weekStartOf("2026-09-18")).toBe("2026-09-14"); // Friday
    expect(weekStartOf("2026-09-14")).toBe("2026-09-14"); // Monday
    expect(weekStartOf("2026-09-20")).toBe("2026-09-14"); // Sunday
  });
});
