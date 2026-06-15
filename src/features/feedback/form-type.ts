export type FormType = "U12" | "U16";

export const FORM_TYPES: readonly FormType[] = ["U12", "U16"] as const;

/**
 * Default feedback template by age (CLAUDE.md "Form Auto-Detection"): the kid-focused
 * U12 form for ≤12, the U16 form for teens. Coach can override on the new-form page.
 */
export function recommendedFormType(age: number): FormType {
  return age <= 12 ? "U12" : "U16";
}

export function isFormType(v: unknown): v is FormType {
  return v === "U12" || v === "U16";
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
