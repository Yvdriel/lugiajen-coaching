import { describe, expect, it } from "vitest";
import { isPortalBlocked } from "@/features/athletes/consent";
import {
  isReelEditable,
  moveInOrder,
  playableReelClips,
  reorderSortValues,
} from "./reel-order";

describe("moveInOrder", () => {
  it("swaps a middle item up", () => {
    expect(moveInOrder(["a", "b", "c"], "b", "up")).toEqual(["b", "a", "c"]);
  });

  it("swaps a middle item down", () => {
    expect(moveInOrder(["a", "b", "c"], "b", "down")).toEqual(["a", "c", "b"]);
  });

  it("is a no-op at the top edge", () => {
    expect(moveInOrder(["a", "b", "c"], "a", "up")).toEqual(["a", "b", "c"]);
  });

  it("is a no-op at the bottom edge", () => {
    expect(moveInOrder(["a", "b", "c"], "c", "down")).toEqual(["a", "b", "c"]);
  });

  it("is a no-op for an unknown id and never mutates the input", () => {
    const input = ["a", "b", "c"];
    expect(moveInOrder(input, "z", "up")).toEqual(["a", "b", "c"]);
    expect(input).toEqual(["a", "b", "c"]);
  });
});

describe("reorderSortValues", () => {
  it("assigns index-based sortOrder, preserving ids", () => {
    expect(reorderSortValues(["x", "y", "z"])).toEqual([
      { id: "x", sortOrder: 0 },
      { id: "y", sortOrder: 1 },
      { id: "z", sortOrder: 2 },
    ]);
  });
});

describe("isReelEditable", () => {
  it("is editable before the meeting (draft / athlete-prepared, not editing)", () => {
    expect(isReelEditable("awaiting_athlete", false)).toBe(true);
    expect(isReelEditable("athlete_submitted", false)).toBe(true);
  });

  it("locks during the in-person meeting (editing)", () => {
    expect(isReelEditable("athlete_submitted", true)).toBe(false);
  });

  it("locks after the meeting (completed)", () => {
    expect(isReelEditable("completed", false)).toBe(false);
    expect(isReelEditable("completed", true)).toBe(false);
  });
});

describe("playableReelClips", () => {
  it("keeps only ready clips (those that get a signed token)", () => {
    const clips = [
      { id: "1", status: "ready" },
      { id: "2", status: "processing" },
      { id: "3", status: "ready" },
      { id: "4", status: "error" },
    ];
    expect(playableReelClips(clips).map((c) => c.id)).toEqual(["1", "3"]);
  });
});

// Decision (2026-06-24): the portal reel rides the EXISTING portal consent gate —
// no separate per-video check. So a reel is denied exactly when the portal is
// blocked. (Invalid/rotated tokens are denied upstream: getAthleteByViewToken
// returns null before any reel is assembled.)
describe("portal reel consent gate", () => {
  const REF = new Date("2026-06-19");
  const dobForAge = (age: number) => `${REF.getFullYear() - age}-01-01`;

  it("denies an under-16 without recorded consent", () => {
    expect(
      isPortalBlocked({ dateOfBirth: dobForAge(12), parentalConsentAt: null }, REF),
    ).toBe(true);
  });

  it("allows an under-16 once consent is recorded", () => {
    expect(
      isPortalBlocked(
        { dateOfBirth: dobForAge(12), parentalConsentAt: new Date() },
        REF,
      ),
    ).toBe(false);
  });

  it("allows 16+ (reel shown alongside the rest of the portal)", () => {
    expect(
      isPortalBlocked({ dateOfBirth: dobForAge(17), parentalConsentAt: null }, REF),
    ).toBe(false);
  });
});
