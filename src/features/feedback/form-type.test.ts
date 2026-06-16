import { describe, expect, it } from "vitest";
import {
  currentSeason,
  maxMeetingNumber,
  recommendedFormType,
} from "./form-type";

describe("recommendedFormType", () => {
  it("picks U12 below 12", () => {
    expect(recommendedFormType(9)).toBe("U12");
    expect(recommendedFormType(11)).toBe("U12");
  });
  it("picks CADET from 12 to 15", () => {
    expect(recommendedFormType(12)).toBe("CADET");
    expect(recommendedFormType(15)).toBe("CADET");
  });
  it("picks JUNIOR from 16 to 17", () => {
    expect(recommendedFormType(16)).toBe("JUNIOR");
    expect(recommendedFormType(17)).toBe("JUNIOR");
  });
  it("picks SENIOR from 18 up", () => {
    expect(recommendedFormType(18)).toBe("SENIOR");
    expect(recommendedFormType(21)).toBe("SENIOR");
  });
});

describe("maxMeetingNumber", () => {
  it("caps U12/CADET at 3, JUNIOR/SENIOR at 12", () => {
    expect(maxMeetingNumber("U12")).toBe(3);
    expect(maxMeetingNumber("CADET")).toBe(3);
    expect(maxMeetingNumber("JUNIOR")).toBe(12);
    expect(maxMeetingNumber("SENIOR")).toBe(12);
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
