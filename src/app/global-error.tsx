"use client";

import "./globals.css";
import { useEffect, useState } from "react";
import { DEFAULT_LOCALE, isLocale, type Locale, messages } from "@/messages";

/**
 * Last-resort boundary for errors in the root layout — it replaces the whole
 * document (so no LocaleProvider above it). Reads the locale cookie client-side
 * after mount; renders the default locale on the server/first paint to avoid a
 * hydration mismatch.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [locale, setLocale] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    console.error(error);
    const match = document.cookie.match(/(?:^|;\s*)lgj_locale=(nl|en)/);
    // One-time client read of the locale cookie (no provider at this level).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (match && isLocale(match[1])) setLocale(match[1]);
  }, [error]);

  const nl = messages[locale];

  return (
    <html lang={locale}>
      <body className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
        <h1 className="text-2xl font-semibold">{nl.error.title}</h1>
        <p className="max-w-sm text-sm text-gray-500">{nl.error.body}</p>
        <button
          type="button"
          onClick={reset}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm"
        >
          {nl.error.retry}
        </button>
      </body>
    </html>
  );
}
