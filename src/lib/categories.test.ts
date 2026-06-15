import { describe, expect, test } from "vitest";
import {
  calculateAge,
  getCategories,
  getCategoriesForAge,
  type Category,
} from "./categories";

const sorted = (c: Category[]) => [...c].sort();

describe("getCategoriesForAge — boundary ages (own + one above)", () => {
  const cases: Array<[number, Category[]]> = [
    [11, ["U12", "U14"]],
    [12, ["U14"]],
    [13, ["U14", "Cadets"]],
    [14, ["Cadets"]],
    [15, ["Cadets", "Juniors"]],
    [16, ["Juniors"]],
    [17, ["Juniors", "U21"]],
    [18, ["U21"]],
    [20, ["U21", "Senior"]],
    [21, ["Senior"]],
  ];

  test.each(cases)("age %i", (age, expected) => {
    expect(sorted(getCategoriesForAge(age))).toEqual(sorted(expected));
  });

  test("young child is U12 only", () => {
    expect(getCategoriesForAge(9)).toEqual(["U12"]);
  });

  test("adult is Senior only", () => {
    expect(getCategoriesForAge(30)).toEqual(["Senior"]);
  });

  test("no duplicates ever", () => {
    for (let age = 0; age <= 40; age++) {
      const cats = getCategoriesForAge(age);
      expect(cats.length).toBe(new Set(cats).size);
    }
  });
});

describe("calculateAge", () => {
  const ref = new Date(2026, 5, 15); // 2026-06-15 (month is 0-indexed)

  test("exactly on birthday", () => {
    expect(calculateAge(new Date(2014, 5, 15), ref)).toBe(12);
  });

  test("day before birthday is one year younger", () => {
    expect(calculateAge(new Date(2014, 5, 16), ref)).toBe(11);
  });

  test("day after birthday counts", () => {
    expect(calculateAge(new Date(2014, 5, 14), ref)).toBe(12);
  });
});

describe("getCategories (dob → categories)", () => {
  const ref = new Date(2026, 5, 15);

  test("13-year-old: U14 + one above Cadets", () => {
    expect(sorted(getCategories(new Date(2013, 0, 1), ref))).toEqual(
      sorted(["U14", "Cadets"]),
    );
  });
});
