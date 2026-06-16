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
  picks: { "a-1": ["U14"], "a-2": ["U21", "Senior"] },
  entries: [
    {
      id: "e-1",
      athleteId: "a-1",
      athleteName: "Sample Atleet",
      category: "U14",
      repertoire: [{ kataId: "k-1", kataName: "Heian Yondan" }],
      draft: { category: "U14", feedbackPerformance: "Goed" },
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
      parseDraft(JSON.stringify({ ...sample, picks: { "a-1": [1] } })),
    ).toBeNull(); // picks values not string[]
    expect(
      parseDraft(JSON.stringify({ ...sample, picks: ["a-1"] })),
    ).toBeNull(); // picks not a record
    expect(
      parseDraft(
        JSON.stringify({
          ...sample,
          entries: [{ id: "e-1", athleteId: "a-1" }],
        }),
      ),
    ).toBeNull(); // entry missing category
  });

  it("rejects an old-format draft (category/selected, no picks)", () => {
    const legacy = {
      step: 1,
      competitionId: "c-1",
      comp: sample.comp,
      category: "U14 Kata",
      selected: ["a-1"],
      entries: [],
    };
    expect(parseDraft(JSON.stringify(legacy))).toBeNull();
  });
});
