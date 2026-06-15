import { describe, expect, it } from "vitest";
import {
  parseDraft,
  serializeDraft,
  type WizardDraft,
} from "./wizard-draft";

const sample: WizardDraft = {
  step: 2,
  competitionId: "c-1",
  comp: {
    name: "Clubkampioenschap",
    date: "2026-03-01",
    competitionType: "club",
    location: "Dojo",
    notes: "",
  },
  category: "U14 Kata",
  selected: ["a-1", "a-2"],
  entries: [
    {
      id: "e-1",
      athleteId: "a-1",
      athleteName: "Sample Atleet",
      repertoire: [{ kataId: "k-1", kataName: "Heian Yondan" }],
      draft: { category: "U14 Kata", feedbackPerformance: "Goed" },
    },
  ],
};

describe("wizard-draft", () => {
  it("round-trips a draft through serialize/parse", () => {
    expect(parseDraft(serializeDraft(sample))).toEqual(sample);
  });

  it("returns null for empty / malformed input", () => {
    expect(parseDraft(null)).toBeNull();
    expect(parseDraft("")).toBeNull();
    expect(parseDraft("{not json")).toBeNull();
    expect(parseDraft("[]")).toBeNull();
    expect(parseDraft('"a string"')).toBeNull();
  });

  it("rejects a draft with the wrong shape", () => {
    expect(parseDraft(JSON.stringify({ step: "1" }))).toBeNull(); // step not a number
    expect(
      parseDraft(JSON.stringify({ ...sample, selected: [1, 2] })),
    ).toBeNull(); // selected not string[]
    expect(
      parseDraft(JSON.stringify({ ...sample, entries: [{ id: "e-1" }] })),
    ).toBeNull(); // entry missing athleteId
  });
});
