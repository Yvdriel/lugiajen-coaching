import { describe, expect, it } from "vitest";
import { computeOverall, INPUT_CRITERIA } from "./criteria";

type OverallInput = Parameters<typeof computeOverall>[0];

/** Build a full 12-criterion object: every input key = base, with optional overrides. */
function card(overrides: Record<string, number> = {}, base = 70): OverallInput {
  const out: Record<string, number> = {};
  for (const c of INPUT_CRITERIA) out[c.key] = overrides[c.key] ?? base;
  return out as OverallInput;
}

describe("computeOverall", () => {
  it("returns the value when all 12 criteria are equal", () => {
    expect(computeOverall(card({}, 70))).toBe(70);
  });

  it("rounds .5 up (Math.round)", () => {
    // eleven 70s + one 76 = 846 / 12 = 70.5 → 71
    expect(computeOverall(card({ stances: 76 }, 70))).toBe(71);
  });

  it("rounds down below .5", () => {
    // eleven 70s + one 71 = 841 / 12 = 70.08 → 70
    expect(computeOverall(card({ stances: 71 }, 70))).toBe(70);
  });

  it("ignores extra (non-criterion) properties like overallImpression/id", () => {
    const withExtras = {
      ...card({}, 60),
      id: "x",
      kataId: "k",
      overallImpression: 999,
    } as OverallInput;
    expect(computeOverall(withExtras)).toBe(60);
  });
});
