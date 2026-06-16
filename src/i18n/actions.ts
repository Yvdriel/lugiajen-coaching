"use server";

import { cookies } from "next/headers";
import { isLocale, type Locale } from "@/messages";
import { LOCALE_COOKIE } from "./server";

/** Persist the chosen language (1-year cookie). The toggle calls this, then refreshes. */
export async function setLocale(locale: Locale): Promise<void> {
  if (!isLocale(locale)) return;
  (await cookies()).set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
}
