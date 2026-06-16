import { describe, expect, it } from "vitest";
import {
  feedbackSchema,
  kataNotesField,
  kataScoreField,
  parseKataRatings,
} from "./schema";

const base = {
  meetingDate: "2026-01-01",
  season: "2026/2027",
};

describe("feedbackSchema meeting cap", () => {
  it("rejects meetingNumber > 3 for CADET", () => {
    const r = feedbackSchema.safeParse({
      ...base,
      formType: "CADET",
      meetingNumber: "5",
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => i.path[0] === "meetingNumber")).toBe(
        true,
      );
    }
  });

  it("accepts meetingNumber up to 12 for SENIOR", () => {
    const r = feedbackSchema.safeParse({
      ...base,
      formType: "SENIOR",
      meetingNumber: "9",
    });
    expect(r.success).toBe(true);
  });

  it("rejects meetingNumber > 12 even for SENIOR", () => {
    const r = feedbackSchema.safeParse({
      ...base,
      formType: "SENIOR",
      meetingNumber: "13",
    });
    expect(r.success).toBe(false);
  });
});

describe("parseKataRatings", () => {
  const ids = ["k1", "k2", "k3"];

  it("keeps rows with a score and/or notes, drops empty rows", () => {
    const fd = new FormData();
    fd.set(kataScoreField("k1"), "7");
    fd.set(kataNotesField("k1"), "Sprong hoger");
    fd.set(kataNotesField("k2"), "Alleen notitie");
    // k3 left blank
    const out = parseKataRatings(fd, ids);
    expect(out).toEqual([
      { kataId: "k1", score: 7, notes: "Sprong hoger" },
      { kataId: "k2", score: null, notes: "Alleen notitie" },
    ]);
  });

  it("ignores an out-of-range score (keeps row only if notes present)", () => {
    const fd = new FormData();
    fd.set(kataScoreField("k1"), "42"); // invalid → null, no notes → dropped
    fd.set(kataScoreField("k2"), "0"); // below min → null
    fd.set(kataNotesField("k2"), "Stabiel");
    const out = parseKataRatings(fd, ids);
    expect(out).toEqual([{ kataId: "k2", score: null, notes: "Stabiel" }]);
  });
});
