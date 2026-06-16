export type FormType = "U12" | "CADET" | "JUNIOR" | "SENIOR";

export const FORM_TYPES: readonly FormType[] = [
  "U12",
  "CADET",
  "JUNIOR",
  "SENIOR",
] as const;

/**
 * Default feedback template by age (CLAUDE.md "Form Auto-Detection"): U12 for kids,
 * CADET (12-15), JUNIOR (16-17), SENIOR (18+). Coach can override on the new-form page.
 */
export function recommendedFormType(age: number): FormType {
  if (age < 12) return "U12";
  if (age < 16) return "CADET";
  if (age < 18) return "JUNIOR";
  return "SENIOR";
}

export function isFormType(v: unknown): v is FormType {
  return v === "U12" || v === "CADET" || v === "JUNIOR" || v === "SENIOR";
}

/**
 * Max meetings per season. U12/CADET meet ~3x/season; JUNIOR/SENIOR train and
 * check in far more often (SENIOR monthly+), so allow a higher meeting number.
 */
export function maxMeetingNumber(formType: FormType): number {
  return formType === "JUNIOR" || formType === "SENIOR" ? 12 : 3;
}

/**
 * Karate season string ("2025/2026") for a date. The season flips in August, so a
 * date in Jan–Jul belongs to the season that started the previous calendar year.
 */
export function currentSeason(reference: Date = new Date()): string {
  const year = reference.getFullYear();
  const startYear = reference.getMonth() >= 7 ? year : year - 1; // month 7 = August
  return `${startYear}/${startYear + 1}`;
}
