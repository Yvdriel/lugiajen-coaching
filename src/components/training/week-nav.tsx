import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { addDays, weekStartOf } from "@/features/training/vli";
import { formatDate } from "@/i18n/format";
import { getLocale, getMessages } from "@/i18n/server";

/** Prev / today / next week links plus the week heading. */
export async function WeekNav({
  basePath,
  weekStart,
  today,
}: {
  basePath: string;
  weekStart: string;
  today: string;
}) {
  const nl = await getMessages();
  const locale = await getLocale();
  const t = nl.athlete.training;
  const href = (ws: string) => `${basePath}?view=week&week=${ws}`;
  const btn = buttonVariants({ variant: "outline", size: "sm" });
  return (
    <div className="print-hide flex items-center justify-between gap-2">
      <Link href={href(addDays(weekStart, -7))} className={btn} aria-label={t.prevWeek}>
        ‹
      </Link>
      <div className="flex items-center gap-2">
        <h2 className="font-heading text-base font-semibold">
          {t.weekOf} {formatDate(weekStart, locale, { day: "numeric", month: "long" })}
        </h2>
        {weekStart !== weekStartOf(today) ? (
          <Link href={href(weekStartOf(today))} className={buttonVariants({ variant: "ghost", size: "xs" })}>
            {t.today}
          </Link>
        ) : null}
      </div>
      <Link href={href(addDays(weekStart, 7))} className={btn} aria-label={t.nextWeek}>
        ›
      </Link>
    </div>
  );
}
