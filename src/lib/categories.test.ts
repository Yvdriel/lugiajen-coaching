import { describe, expect, test } from "vitest";
import {
  calculateAge,
  getCategories,
  getCategoriesForAge,
  type Category,
} from "./categories";

const sorted = (c: Category[]) => [...c].sort();

describe("getCategoriesForAge — boundary ages (explicit ranges)", () => {
  const cases: Array<[number, Category[]]> = [
    [9, ["U10"]],
    [10, ["U12"]],
    [11, ["U12"]],
    [12, ["U14"]],
    [13, ["U14"]],
    [14, ["Cadets"]],
    [15, ["Cadets"]],
    [16, ["Juniors", "Senior"]],
    [17, ["Juniors", "Senior"]],
    [18, ["U21", "Senior"]],
    [20, ["U21", "Senior"]],
    [21, ["Senior"]],
  ];

  test.each(cases)("age %i", (age, expected) => {
    expect(sorted(getCategoriesForAge(age))).toEqual(sorted(expected));
  });

  test("young child is U10 only", () => {
    expect(getCategoriesForAge(5)).toEqual(["U10"]);
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

  test("13-year-old is U14 only", () => {
    expect(getCategories(new Date(2013, 0, 1), ref)).toEqual(["U14"]);
  });

  test("17-year-old is Juniors + Senior", () => {
    expect(sorted(getCategories(new Date(2009, 0, 1), ref))).toEqual(
      sorted(["Juniors", "Senior"]),
    );
  });
});
