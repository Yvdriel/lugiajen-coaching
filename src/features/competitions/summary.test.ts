import { describe, expect, it } from "vitest";
import { summarizeAthleteCompetitions } from "./summary";

describe("summarizeAthleteCompetitions", () => {
  it("counts total events, podium, and most-performed kata", () => {
    const s = summarizeAthleteCompetitions([
      { placement: 1, katas: ["Kanku Dai", "Bassai Dai"] },
      { placement: 2, katas: ["Kanku Dai"] },
      { placement: null, katas: ["Kanku Dai", "Heian Yondan"] },
    ]);
    expect(s.totalEvents).toBe(3);
    expect(s.podium).toEqual({ first: 1, second: 1, third: 0 });
    expect(s.mostKata).toBe("Kanku Dai");
  });

  it("handles empty input", () => {
    const s = summarizeAthleteCompetitions([]);
    expect(s.totalEvents).toBe(0);
    expect(s.podium).toEqual({ first: 0, second: 0, third: 0 });
    expect(s.mostKata).toBeNull();
  });

  it("ignores placements outside 1–3 for the podium", () => {
    const s = summarizeAthleteCompetitions([
      { placement: 4, katas: [] },
      { placement: 3, katas: ["Unsu"] },
    ]);
    expect(s.podium).toEqual({ first: 0, second: 0, third: 1 });
    expect(s.mostKata).toBe("Unsu");
  });
});
