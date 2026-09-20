"use client";

import type { SessionWithVli } from "@/features/training/context";
import { mainKata } from "@/features/training/week-view";
import { useLocale, useMessages } from "@/i18n/client";
import { formatDate } from "@/i18n/format";
import { cn } from "@/lib/utils";

/** Dark day block: weekday, main kata, badges (plan week, title, status). */
export function DayHeader({
  date,
  sessions,
  planWeek,
  today,
  className,
}: {
  date: string;
  sessions: SessionWithVli[];
  planWeek: { index: number; character: string } | null;
  today: string;
  className?: string;
}) {
  const t = useMessages().athlete.training;
  const locale = useLocale();
  const first = sessions[0];
  const kata = first ? mainKata(first) : null;
  const badges: string[] = [];
  if (planWeek) badges.push(`${t.planWeek} ${planWeek.index}`);
  for (const s of sessions)
    if (s.title) badges.push(...s.title.split("·").map((x) => x.trim()));
  const skipped = first && sessions.every((s) => s.skippedAt != null);
  const done = first && !skipped && sessions.some((s) => s.done);

  return (
    <div
      className={cn(
        "rounded-t-md bg-brand-near-black px-4 py-3 text-brand-white",
        date === today && "ring-2 ring-foreground ring-offset-2",
        className,
      )}
    >
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="font-heading text-xl font-bold uppercase tracking-wide">
          {formatDate(date, locale, { weekday: "long" })}
        </h3>
        <span className="text-xs text-brand-soft-gray">
          {formatDate(date, locale, { day: "2-digit", month: "2-digit" })}
        </span>
      </div>
      <p className="mt-0.5 text-xs uppercase tracking-wide text-brand-soft-gray">
        {first
          ? kata
            ? `${kata} — ${t.mainKata}`
            : t.noKata
          : t.noSessions}
      </p>
      {badges.length > 0 || done || skipped ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {badges.map((b, i) => (
            <span
              key={`${b}-${i}`}
              className="rounded-full bg-brand-dark-gray px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
            >
              {b}
            </span>
          ))}
          {done ? (
            <span className="rounded-full bg-brand-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-brand-black">
              {t.done} ✓
            </span>
          ) : null}
          {skipped ? (
            <span className="rounded-full bg-brand-mid-gray px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider line-through">
              {t.skipped}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
