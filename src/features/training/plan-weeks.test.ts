import { describe, expect, it } from "vitest";
import { ageCaps, suggestPlanWeeks } from "./plan-weeks";

describe("suggestPlanWeeks", () => {
  it("adult: six weeks ending in the competition's ISO week", () => {
    const w = suggestPlanWeeks({ competitionDate: "2026-11-07", age: 19 }); // Saturday
    expect(w).toHaveLength(6);
    expect(w[0]).toMatchObject({
      weekStart: "2026-09-28",
      targetLoad: 10,
      weeksOut: 5,
    });
    expect(w[5]).toMatchObject({
      weekStart: "2026-11-02",
      targetLoad: 2,
      targetIntensity: 5,
      weeksOut: 0,
    });
  });

  it("fewer weeks keeps the rows closest to competition", () => {
    const w = suggestPlanWeeks({
      competitionDate: "2026-11-07",
      age: 19,
      weeks: 3,
    });
    expect(w.map((x) => x.targetLoad)).toEqual([6, 5, 2]);
    expect(w[0].weekStart).toBe("2026-10-19");
  });

  it("youth caps load and intensity", () => {
    const w = suggestPlanWeeks({ competitionDate: "2026-11-07", age: 10 });
    expect(w.map((x) => x.targetLoad)).toEqual([5, 5, 5, 5, 5, 2]);
    expect(Math.max(...w.map((x) => x.targetIntensity))).toBe(3);
  });

  it("ageCaps boundaries", () => {
    expect(ageCaps(11)).toEqual({ load: 5, intensity: 3 });
    expect(ageCaps(14)).toEqual({ load: 7, intensity: 3.5 });
    expect(ageCaps(17)).toEqual({ load: 9, intensity: 5 });
    expect(ageCaps(18)).toEqual({ load: 10, intensity: 5 });
  });
});
