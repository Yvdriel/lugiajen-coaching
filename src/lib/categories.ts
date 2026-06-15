/**
 * WKF age-category logic (CLAUDE.md). An athlete competes in their OWN category
 * AND the one above. Logic is kept verbatim from the spec; `getCategoriesForAge`
 * is pure (integer in) so it's deterministic to unit-test.
 */
export type Category = "U12" | "U14" | "Cadets" | "Juniors" | "U21" | "Senior";

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

/** Eligible categories for a given age (own + one above), deduplicated. */
export function getCategoriesForAge(age: number): Category[] {
  const categories: Category[] = [];

  if (age < 12) categories.push("U12");
  if (age >= 12 && age <= 13) categories.push("U14");
  if (age >= 14 && age <= 15) categories.push("Cadets");
  if (age >= 16 && age <= 17) categories.push("Juniors");
  if (age >= 18 && age <= 20) categories.push("U21");
  if (age >= 21) categories.push("Senior");

  // Athletes can also compete one category up.
  if (age >= 11 && age <= 12) categories.push("U14");
  if (age >= 13 && age <= 14) categories.push("Cadets");
  if (age >= 15 && age <= 16) categories.push("Juniors");
  if (age >= 17 && age <= 18) categories.push("U21");
  if (age >= 20 && age <= 21) categories.push("Senior");

  return [...new Set(categories)];
}

/** Eligible categories from a date of birth. */
export function getCategories(
  dateOfBirth: Date,
  reference?: Date,
): Category[] {
  return getCategoriesForAge(calculateAge(dateOfBirth, reference));
}
