import { Loader2 } from "lucide-react";
import { nl } from "@/messages/nl";

/** Shared route-level loading fallback (used by `loading.tsx` segments). */
export function LoadingScreen() {
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
