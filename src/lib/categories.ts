/**
 * WKF age-category logic. Eligibility is the explicit competition age range per
 * category — an athlete belongs to every category whose range covers their age.
 * The youth bands (U10–Cadets) are disjoint 2-year ranges; the overlap at the top
 * is intrinsic: Senior is open (16+), so 16–20 year-olds are eligible for both
 * their youth band (Juniors/U21) and Senior. `getCategoriesForAge` is pure
 * (integer in) so it's deterministic to unit-test.
 */
/** All age categories, youngest first. Single source of truth for the `Category` union. */
export const CATEGORY_VALUES = [
  "U10",
  "U12",
  "U14",
  "Cadets",
  "Juniors",
  "U21",
  "Senior",
] as const;

export type Category = (typeof CATEGORY_VALUES)[number];

/** Type guard: is `v` one of the known age categories? */
export function isCategory(v: unknown): v is Category {
  return (CATEGORY_VALUES as readonly unknown[]).includes(v);
}

/** Whole-years age at `reference` (default: now). */
export function calculateAge(
  dateOfBirth: Date,
  reference: Date = new Date(),
): number {
  let age = reference.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = reference.getMonth() - dateOfBirth.getMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && reference.getDate() < dateOfBirth.getDate())
  ) {
    age--;
  }
  return age;
}

/**
 * Eligible categories for a given age, ordered youngest band first. Ranges are
 * [min, max) — i.e. the upper bound is exclusive (Cadets = 14–15, not 14–16).
 * Senior is open at 16+, so it stacks on top of Juniors/U21.
 */
export function getCategoriesForAge(age: number): Category[] {
  const categories: Category[] = [];

  if (age < 10) categories.push("U10");
  if (age >= 10 && age < 12) categories.push("U12");
  if (age >= 12 && age < 14) categories.push("U14");
  if (age >= 14 && age < 16) categories.push("Cadets");
  if (age >= 16 && age < 18) categories.push("Juniors");
  if (age >= 18 && age < 21) categories.push("U21");
  if (age >= 16) categories.push("Senior");

  return [...new Set(categories)];
}

/** Eligible categories from a date of birth. */
export function getCategories(
  dateOfBirth: Date,
  reference?: Date,
): Category[] {
  return getCategoriesForAge(calculateAge(dateOfBirth, reference));
}
