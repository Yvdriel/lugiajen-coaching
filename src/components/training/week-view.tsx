"use client";

import Link from "next/link";
import { useState } from "react";
import { BlockLine } from "@/components/training/block-line";
import { DayHeader } from "@/components/training/day-header";
import {
  cellSummary,
  type DayColumn,
  defaultDay,
  type WeekGrid,
} from "@/features/training/week-view";
import { useLocale, useMessages } from "@/i18n/client";
import { formatDate } from "@/i18n/format";
import { cn } from "@/lib/utils";

type Props = {
  grid: WeekGrid;
  planWeek: { index: number; character: string } | null;
  today: string;
  mode: "coach" | "public";
  basePath: string;
};

/**
 * Week grid: desktop = days with sessions × parts present (the sheet layout),
 * mobile = one day at a time behind a 7-day strip. Pure: props in, links out.
 */
export function WeekView({ grid, planWeek, today, mode, basePath }: Props) {
  const t = useMessages().athlete.training;
  const locale = useLocale();
  const [day, setDay] = useState(() => defaultDay(grid, today));
  const active = grid.days.filter((d) => d.sessions.length > 0);
  const selected = grid.days[day - 1];

  const cell = (d: DayColumn, part: number) => {
    const blocks = d.sessions.flatMap((s) =>
      s.blocks
        .filter((b) => b.part === part)
        .map((b) => ({ b, sid: s.id, skipped: s.skippedAt != null })),
    );
    if (blocks.length === 0)
      return (
        <div className="min-h-16 rounded-md bg-card p-3 text-sm text-muted-foreground ring-1 ring-foreground/10">
          —
        </div>
      );
    return (
      <Link
        href={`${basePath}/${blocks[0].sid}`}
        className={cn(
          "flex min-h-16 flex-col gap-2 rounded-md bg-card p-3 ring-1 ring-foreground/10 transition-colors hover:bg-muted",
          blocks.every((x) => x.skipped) && "opacity-60",
        )}
      >
        {blocks.map(({ b }, i) => (
          <div key={b.id} className="flex flex-col gap-1">
            {i === 0 ? (
              <span className="self-end text-xs font-semibold tabular-nums">
                {cellSummary(b)}
              </span>
            ) : null}
            <BlockLine block={b} mode={mode} variant="cell" />
          </div>
        ))}
      </Link>
    );
  };

  const column = (d: DayColumn, showHeader: boolean) => (
    <div key={d.date} className="flex flex-col gap-2">
      {showHeader ? (
        <DayHeader
          date={d.date}
          sessions={d.sessions}
          planWeek={planWeek}
          today={today}
        />
      ) : null}
      {grid.parts.map((p) => (
        <div key={p} className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground md:hidden">
            {t.parts[p as keyof typeof t.parts]}
          </span>
          {cell(d, p)}
        </div>
      ))}
    </div>
  );

  return (
    <div>
      {/* Mobile: 7-day strip + one column */}
      <div className="md:hidden">
        <div className="mb-3 grid grid-cols-7 gap-1">
          {grid.days.map((d) => (
            <button
              key={d.date}
              type="button"
              onClick={() => setDay(d.weekday)}
              className={cn(
                "flex flex-col items-center rounded-md py-1.5 text-xs uppercase",
                d.weekday === day
                  ? "bg-brand-near-black text-brand-white"
                  : "bg-muted text-muted-foreground",
                d.date === today && "ring-1 ring-foreground",
              )}
            >
              <span>{formatDate(d.date, locale, { weekday: "short" })}</span>
              <span
                className={cn(
                  "mt-1 size-1.5 rounded-full",
                  d.sessions.length > 0 ? "bg-current" : "bg-transparent",
                )}
              />
            </button>
          ))}
        </div>
        {column(selected, true)}
      </div>

      {/* Desktop: sheet grid */}
      {active.length === 0 ? (
        <p className="hidden text-sm text-muted-foreground md:block">
          {t.noSessions}
        </p>
      ) : (
        <div
          className="hidden gap-3 md:grid"
          style={{
            gridTemplateColumns: `8rem repeat(${active.length}, minmax(0, 1fr))`,
          }}
        >
          <div />
          {active.map((d) => (
            <DayHeader
              key={d.date}
              date={d.date}
              sessions={d.sessions}
              planWeek={planWeek}
              today={today}
            />
          ))}
          {grid.parts.map((p) => (
            <div key={p} className="contents">
              <div className="border-l-2 border-foreground pl-3 pt-3 text-sm font-semibold leading-tight">
                {t.parts[p as keyof typeof t.parts]}
              </div>
              {active.map((d) => (
                <div key={d.date}>{cell(d, p)}</div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
