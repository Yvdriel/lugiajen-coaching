"use client";

import "./globals.css";
import { useEffect } from "react";
import { nl } from "@/messages/nl";

/**
 * Last-resort boundary for errors in the root layout — it replaces the whole
 * document, so it renders its own <html>/<body> and stays dependency-light.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="nl">
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
