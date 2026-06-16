import { en } from "./en";
import { nl } from "./nl";
import type { Messages } from "./types";

export type Locale = "nl" | "en";

export const LOCALES: Locale[] = ["nl", "en"];
export const DEFAULT_LOCALE: Locale = "nl";

/** Both catalogs keyed by locale. `nl` is the source of truth; `en` mirrors its shape. */
export const messages: Record<Locale, Messages> = { nl, en };

export type { Messages };

export function isLocale(value: unknown): value is Locale {
  return value === "nl" || value === "en";
}
