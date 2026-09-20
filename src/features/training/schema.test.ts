import { describe, expect, it } from "vitest";
import type { KataLibraryItem } from "@/lib/queries/kata";
import {
  blockInputSchema,
  planInputSchema,
  validateBlockSplit,
} from "./schema";

const UUID = "00000000-0000-0000-0000-000000000000";

const kata = (o: Partial<KataLibraryItem> = {}): KataLibraryItem => ({
  id: "k",
  name: "Enpi",
  category: "competition",
  splitQuarter: false,
  splitThird: true,
  splitHalf: true,
  flexibilityCategory: "B",
  sortOrder: 1,
  ...o,
});

describe("blockInputSchema", () => {
  it("requires split, sections and reps when kataId is set", () => {
    expect(blockInputSchema.safeParse({ part: 5, kataId: UUID }).success).toBe(
      false,
    );
    expect(
      blockInputSchema.safeParse({
        part: 5,
        kataId: UUID,
        split: "third",
        sections: [1, 2, 3],
        reps: 10,
      }).success,
    ).toBe(true);
  });

  it("requires a label when kataId is absent", () => {
    expect(blockInputSchema.safeParse({ part: 2 }).success).toBe(false);
    expect(
      blockInputSchema.safeParse({ part: 2, label: "S&C", minutes: 30 })
        .success,
    ).toBe(true);
  });

  it("rejects a section index outside the split size", () => {
    const r = blockInputSchema.safeParse({
      part: 5,
      kataId: UUID,
      split: "third",
      sections: [4],
      reps: 3,
    });
    expect(r.success).toBe(false);
  });

  it("defaults rounds, format and vest", () => {
    const r = blockInputSchema.parse({ part: 1, label: "Warm-up" });
    expect(r.rounds).toBe(1);
    expect(r.format).toBe("technical");
    expect(r.vest).toBe(false);
  });
});

describe("planInputSchema", () => {
  it("rejects endDate before startDate", () => {
    const r = planInputSchema.safeParse({
      athleteId: UUID,
      name: "Prep",
      startDate: "2026-10-01",
      endDate: "2026-09-01",
    });
    expect(r.success).toBe(false);
  });
});

describe("validateBlockSplit", () => {
  it("allows full always, rejects quarter on a category B kata", () => {
    expect(validateBlockSplit({ split: "full" }, kata())).toBeNull();
    expect(validateBlockSplit({ split: "third" }, kata())).toBeNull();
    expect(validateBlockSplit({ split: "quarter" }, kata())).toMatch(/Enpi/);
    expect(
      validateBlockSplit({ split: "quarter" }, kata({ splitQuarter: true })),
    ).toBeNull();
  });
});
