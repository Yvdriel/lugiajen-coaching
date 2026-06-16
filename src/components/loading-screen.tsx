"use client";

import { Loader2 } from "lucide-react";
import { useMessages } from "@/i18n/client";

/** Shared route-level loading fallback (used by `loading.tsx` segments). */
export function LoadingScreen() {
  const nl = useMessages();
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-[40vh] flex-col items-center justify-center gap-3 p-8 text-muted-foreground"
    >
      <Loader2 className="size-6 animate-spin" aria-hidden />
      <span className="text-sm">{nl.common.loading}</span>
    </div>
  );
}
