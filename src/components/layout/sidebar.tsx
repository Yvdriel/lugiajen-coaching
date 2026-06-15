import Link from "next/link";
import { cn } from "@/lib/utils";
import { NAV_LINKS } from "./nav-links";
import { NavUser } from "./nav-user";

export function Sidebar({
  userName,
  userEmail,
  className,
}: {
  userName: string;
  userEmail: string;
  className?: string;
}) {
  return (
    <aside
      className={cn(
        "flex w-60 shrink-0 flex-col border-r border-border bg-brand-field-bg/40",
        className,
      )}
    >
      <div className="px-4 py-5">
        <span className="font-heading text-lg font-semibold">Lu Gia Jen</span>
        <p className="text-xs text-muted-foreground">Coaching</p>
      </div>
      <nav className="flex flex-1 flex-col gap-1 px-2">
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-md px-3 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-accent hover:text-foreground"
          >
            {link.label}
          </Link>
        ))}
      </nav>
      <NavUser name={userName} email={userEmail} />
    </aside>
  );
}
