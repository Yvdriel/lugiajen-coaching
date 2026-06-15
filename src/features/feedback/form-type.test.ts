import { describe, expect, it } from "vitest";
import { currentSeason, recommendedFormType } from "./form-type";

describe("recommendedFormType", () => {
  it("picks U12 at the boundary and below", () => {
    expect(recommendedFormType(9)).toBe("U12");
    expect(recommendedFormType(12)).toBe("U12");
  });
  it("picks U16 from 13 up", () => {
    expect(recommendedFormType(13)).toBe("U16");
    expect(recommendedFormType(17)).toBe("U16");
    expect(recommendedFormType(21)).toBe("U16");
  });
});

describe("currentSeason", () => {
  it("Jan–Jul belongs to the season that started last August", () => {
    expect(currentSeason(new Date("2026-06-15"))).toBe("2025/2026");
    expect(currentSeason(new Date("2026-01-01"))).toBe("2025/2026");
    expect(currentSeason(new Date("2026-07-31"))).toBe("2025/2026");
  });
  it("Aug–Dec starts the new season", () => {
    expect(currentSeason(new Date("2026-08-01"))).toBe("2026/2027");
    expect(currentSeason(new Date("2026-12-31"))).toBe("2026/2027");
  });
});
