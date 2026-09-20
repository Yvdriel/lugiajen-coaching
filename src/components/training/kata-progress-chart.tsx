"use client";

import { Bar, ComposedChart, Line, XAxis, YAxis } from "recharts";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { KataProgressData } from "@/features/training/page-data";
import { weekStartOf } from "@/features/training/vli";
import { useLocale, useMessages } from "@/i18n/client";
import { formatDate } from "@/i18n/format";

/** Weekly load bars for one kata with scoring-card overall as dots on a 0–100 axis. */
export function KataProgressChart({ kata }: { kata: KataProgressData }) {
  const t = useMessages().athlete.training;
  const locale = useLocale();
  const config = {
    load: { label: t.load, color: "var(--chart-2)" },
    score: { label: t.progress.score, color: "var(--chart-5)" },
  } satisfies ChartConfig;
  const scoreByWeek = new Map<string, number>();
  for (const c of kata.cards) scoreByWeek.set(weekStartOf(c.assessmentDate), c.overallImpression);
  const data = kata.weeks.map((w) => ({
    label: formatDate(w.weekStart, locale, { day: "2-digit", month: "2-digit" }),
    load: w.load,
    score: scoreByWeek.get(w.weekStart) ?? null,
  }));

  return (
    <section className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold">{kata.kataName}</h3>
        {kata.cards.length === 0 ? (
          <span className="text-xs text-muted-foreground">{t.progress.noCards}</span>
        ) : null}
      </div>
      <ChartContainer config={config} className="aspect-[2/1] w-full md:aspect-[4/1]">
        <ComposedChart data={data} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
          <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={10} minTickGap={24} />
          <YAxis yAxisId="load" tickLine={false} axisLine={false} width={28} fontSize={10} allowDecimals={false} />
          <YAxis yAxisId="score" orientation="right" domain={[0, 100]} hide />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar yAxisId="load" dataKey="load" fill="var(--color-load)" radius={2} isAnimationActive={false} />
          <Line
            yAxisId="score"
            dataKey="score"
            stroke="var(--color-score)"
            strokeWidth={1}
            strokeDasharray="3 3"
            connectNulls
            dot={{ r: 4, fill: "var(--color-score)" }}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ChartContainer>
    </section>
  );
}
