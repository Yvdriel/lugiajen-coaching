import { describe, expect, it } from "vitest";
import {
  athletePrepSchema,
  FEEDBACK_ATHLETE_FIELDS,
  FEEDBACK_COACH_FIELDS,
  FEEDBACK_CONTENT_FIELDS,
} from "./schema";

// The athlete/coach split is the public-prepare security boundary: the public
// submit action can only ever write Side A. These guard that the partition stays
// exhaustive and disjoint, so a future content field forces a deliberate choice.
describe("feedback field partition", () => {
  it("athlete ∪ coach === content (exhaustive)", () => {
    const union = new Set([
      ...FEEDBACK_ATHLETE_FIELDS,
      ...FEEDBACK_COACH_FIELDS,
    ]);
    expect(union.size).toBe(FEEDBACK_CONTENT_FIELDS.length);
    for (const k of FEEDBACK_CONTENT_FIELDS) expect(union.has(k)).toBe(true);
  });

  it("athlete ∩ coach === ∅ (disjoint)", () => {
    const coach = new Set<string>(FEEDBACK_COACH_FIELDS);
    for (const k of FEEDBACK_ATHLETE_FIELDS) expect(coach.has(k)).toBe(false);
  });

  it("athletePrepSchema rejects coach fields (only Side A is in its shape)", () => {
    const parsed = athletePrepSchema.parse({
      formType: "CADET",
      athleteProudOf: "trots",
      coachStrength: "smuggled",
      goalMain: "smuggled",
    });
    expect(parsed).not.toHaveProperty("coachStrength");
    expect(parsed).not.toHaveProperty("goalMain");
    expect(parsed.athleteProudOf).toBe("trots");
  });
});
