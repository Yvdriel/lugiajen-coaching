import Link from "next/link";
import { NavUser } from "./nav-user";

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/athletes", label: "Atleten" },
  { href: "/competitions", label: "Wedstrijden" },
];

export function Sidebar({
  userName,
  userEmail,
}: {
  userName: string;
  userEmail: string;
}) {
  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-brand-field-bg/40">
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
