import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { MonthGroup } from "@/features/training/page-data";
import { mainKata } from "@/features/training/week-view";
import { formatDate } from "@/i18n/format";
import { getLocale, getMessages } from "@/i18n/server";

function Group({
  groups,
  hrefFor,
  locale,
  t,
}: {
  groups: MonthGroup[];
  hrefFor: (id: string) => string;
  locale: "nl" | "en";
  t: { done: string; skipped: string; planned: string; load: string };
}) {
  return (
    <div className="flex flex-col gap-4">
      {groups.map((g) => (
        <section key={g.month} className="flex flex-col gap-1">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {formatDate(`${g.month}-01`, locale, { month: "long", year: "numeric" })}
          </h3>
          <ul className="divide-y divide-border rounded-md bg-card ring-1 ring-foreground/10">
            {g.sessions.map((s) => {
              const status = s.skippedAt ? t.skipped : s.done ? t.done : t.planned;
              return (
                <li key={s.id}>
                  <Link href={hrefFor(s.id)} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted">
                    <span className="w-20 shrink-0 text-xs uppercase text-muted-foreground">
                      {formatDate(s.date, locale, { weekday: "short", day: "2-digit", month: "2-digit" })}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm">
                      <span className="font-semibold">{mainKata(s) ?? s.title ?? "—"}</span>
                      {s.title && mainKata(s) ? <span className="text-muted-foreground"> · {s.title}</span> : null}
                    </span>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {t.load} {s.vli.load}
                    </span>
                    <Badge variant={s.skippedAt ? "secondary" : s.done ? "default" : "outline"}>{status}</Badge>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

/** Upcoming sessions by month; past six months behind a native disclosure. */
export async function AgendaList({
  upcoming,
  past,
  hrefFor,
}: {
  upcoming: MonthGroup[];
  past: MonthGroup[];
  hrefFor: (id: string) => string;
}) {
  const nl = await getMessages();
  const locale = await getLocale();
  const t = nl.athlete.training;
  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <h2 className="font-heading text-base font-semibold">{t.agenda.upcoming}</h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.agenda.empty}</p>
        ) : (
          <Group groups={upcoming} hrefFor={hrefFor} locale={locale} t={t} />
        )}
      </section>
      {past.length > 0 ? (
        <details className="flex flex-col gap-2">
          <summary className="cursor-pointer font-heading text-base font-semibold">{t.agenda.past}</summary>
          <div className="pt-2">
            <Group groups={past} hrefFor={hrefFor} locale={locale} t={t} />
          </div>
        </details>
      ) : null}
    </div>
  );
}
