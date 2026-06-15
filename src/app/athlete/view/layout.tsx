import type { ReactNode } from "react";
import { nl } from "@/messages/nl";

/**
 * Minimal branded shell for the public athlete portal (Ch10): no sidebar, no nav,
 * no auth. Sits outside the `(coach)` group, so it inherits no session guard.
 */
export default function PortalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-full">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-4xl items-baseline gap-2 px-6 py-4">
          <span className="font-heading text-lg font-semibold">
            {nl.app.name}
          </span>
          <span className="text-xs text-muted-foreground">{nl.app.tagline}</span>
        </div>
      </header>
      {children}
    </div>
  );
}
