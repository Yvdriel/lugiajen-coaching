import type { ReactNode } from "react";
import { LanguageToggle } from "@/components/layout/language-toggle";
import { getMessages } from "@/i18n/server";

/**
 * Minimal branded shell for the public athlete portal (Ch10): no sidebar, no nav,
 * no auth. Sits outside the `(coach)` group, so it inherits no session guard.
 */
export default async function PortalLayout({
  children,
}: {
  children: ReactNode;
}) {
  const nl = await getMessages();
  return (
    <div className="min-h-full">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-6 py-4">
          <LanguageToggle />
          <div className="flex items-baseline gap-2">
            <span className="font-heading text-lg font-semibold">
              {nl.app.name}
            </span>
            <span className="text-xs text-muted-foreground">
              {nl.app.tagline}
            </span>
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
