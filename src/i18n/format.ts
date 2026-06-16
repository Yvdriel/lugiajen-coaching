import type { Locale } from "@/messages";

const DATE_LOCALE: Record<Locale, string> = { nl: "nl-NL", en: "en-GB" };

/** Locale-aware short date. Replaces the hardcoded `toLocaleDateString("nl-NL")` calls. */
export function formatDate(
  value: string | Date,
  locale: Locale,
  options?: Intl.DateTimeFormatOptions,
): string {
  return new Date(value).toLocaleDateString(DATE_LOCALE[locale], options);
}

/** Locale-aware date+time (for note timestamps). */
export function formatDateTime(value: string | Date, locale: Locale): string {
  return new Date(value).toLocaleString(DATE_LOCALE[locale]);
}
