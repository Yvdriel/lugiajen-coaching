import { cookies } from "next/headers";
import { cache } from "react";
import {
  DEFAULT_LOCALE,
  isLocale,
  type Locale,
  type Messages,
  messages,
} from "@/messages";

export const LOCALE_COOKIE = "lgj_locale";

/**
 * Active locale for the current request, from the `lgj_locale` cookie (absent →
 * Dutch). `cache()` dedupes the cookie read across the render tree, so every
 * server component can call this freely.
 */
export const getLocale = cache(async (): Promise<Locale> => {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
});

/** The message catalog for the current request's locale. */
export async function getMessages(): Promise<Messages> {
  return messages[await getLocale()];
}
