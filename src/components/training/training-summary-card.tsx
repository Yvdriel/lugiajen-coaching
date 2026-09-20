import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TrainingSummary } from "@/features/training/page-data";
import { formatDate } from "@/i18n/format";
import { getLocale, getMessages } from "@/i18n/server";

/** Athlete-tab entry point: this week's numbers, next session, link to the training area. */
export async function TrainingSummaryCard({
  summary,
  href,
}: {
  summary: TrainingSummary;
  href: string;
}) {
  const nl = await getMessages();
  const locale = await getLocale();
  const t = nl.athlete.training;
  const w = summary.week;
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>{t.thisWeek}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <dl className="grid grid-cols-3 gap-2 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">{t.load}</dt>
            <dd className="font-heading text-xl font-semibold tabular-nums">
              {w.total.load}
              {w.target ? <span className="text-sm text-muted-foreground"> / {w.target.targetLoad}</span> : null}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">{t.intensity}</dt>
            <dd className="font-heading text-xl font-semibold tabular-nums">
              {w.total.intensity ?? "—"}
              {w.target ? <span className="text-sm text-muted-foreground"> / {w.target.targetIntensity}</span> : null}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">{t.sessionsThisWeek}</dt>
            <dd className="font-heading text-xl font-semibold tabular-nums">
              {w.sessionsDone}
              <span className="text-sm text-muted-foreground"> / {w.sessionsDone + w.sessionsPlanned + w.sessionsSkipped}</span>
            </dd>
          </div>
        </dl>
        <p className="text-sm">
          <span className="text-muted-foreground">{t.nextSession}: </span>
          {summary.next ? (
            <>
              {formatDate(summary.next.date, locale, { weekday: "long", day: "numeric", month: "long" })}
              {summary.next.kata ? ` · ${summary.next.kata}` : ""}
            </>
          ) : (
            t.noNextSession
          )}
        </p>
        <Link href={href} className={buttonVariants({ size: "sm" })}>
          {t.open}
        </Link>
      </CardContent>
    </Card>
  );
}
