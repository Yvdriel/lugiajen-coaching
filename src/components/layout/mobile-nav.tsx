"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { nl } from "@/messages/nl";
import { NAV_LINKS } from "./nav-links";
import { NavUser } from "./nav-user";

/**
 * Mobile-only (`md:hidden`) top bar + slide-over nav drawer. Desktop keeps the
 * static `Sidebar`. Closes on link click, Esc, or overlay tap; focuses the panel
 * on open. Hand-rolled (no Sheet dep) — a11y via aria-modal/label + Esc + focus.
 */
export function MobileNav({
  userName,
  userEmail,
}: {
  userName: string;
  userEmail: string;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const panelRef = useRef<HTMLDivElement>(null);

  // Close + focus management while the drawer is open.
  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="md:hidden">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background px-4 py-3">
        <div>
          <span className="font-heading text-base font-semibold">
            {nl.app.name}
          </span>
          <span className="ml-2 text-xs text-muted-foreground">
            {nl.app.tagline}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={nl.nav.openMenu}
          aria-expanded={open}
          className="rounded-md p-2 text-foreground hover:bg-accent"
        >
          <Menu className="size-5" aria-hidden />
        </button>
      </header>

      {open ? (
        <div className="fixed inset-0 z-40" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label={nl.nav.closeMenu}
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/40"
          />
          <div
            ref={panelRef}
            tabIndex={-1}
            className="absolute inset-y-0 right-0 flex w-72 max-w-[85%] flex-col border-l border-border bg-background outline-none"
          >
            <div className="flex items-center justify-between px-4 py-3">
              <span className="font-heading text-base font-semibold">
                {nl.app.name}
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={nl.nav.closeMenu}
                className="rounded-md p-2 text-foreground hover:bg-accent"
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>
            <nav className="flex flex-1 flex-col gap-1 px-2">
              {NAV_LINKS.map((link) => {
                const active =
                  pathname === link.href ||
                  pathname.startsWith(`${link.href}/`);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "rounded-md px-3 py-2.5 text-sm font-medium transition-colors hover:bg-accent",
                      active
                        ? "bg-accent text-foreground"
                        : "text-foreground/80",
                    )}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
            <NavUser name={userName} email={userEmail} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
