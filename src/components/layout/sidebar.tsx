import Link from "next/link";
import { getMessages } from "@/i18n/server";
import { cn } from "@/lib/utils";
import { LanguageToggle } from "./language-toggle";
import { NAV_LINKS } from "./nav-links";
import { NavUser } from "./nav-user";

export async function Sidebar({
  userName,
  userEmail,
  className,
}: {
  userName: string;
  userEmail: string;
  className?: string;
}) {
  const nl = await getMessages();
  return (
    <aside
      className={cn(
        "flex w-60 shrink-0 flex-col border-r border-border bg-brand-field-bg/40",
        className,
      )}
    >
      <div className="flex flex-col gap-3 px-4 py-5">
        <LanguageToggle className="self-start" />
        <div>
          <span className="font-heading text-lg font-semibold">
            {nl.app.name}
          </span>
          <p className="text-xs text-muted-foreground">{nl.app.tagline}</p>
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-1 px-2">
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-md px-3 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-accent hover:text-foreground"
          >
            {nl.nav[link.key]}
          </Link>
        ))}
      </nav>
      <NavUser name={userName} email={userEmail} />
    </aside>
  );
}
