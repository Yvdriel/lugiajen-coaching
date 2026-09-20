"use client";

import { Bar, BarChart, Cell, XAxis, YAxis } from "recharts";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { WeekVli } from "@/features/training/progress";
import { useLocale, useMessages } from "@/i18n/client";
import { formatDate } from "@/i18n/format";

/** Target vs actual load per ISO week; the shown week gets the dark bar. */
export function LoadStrip({
  weeks,
  weekStart,
}: {
  weeks: WeekVli[];
  weekStart: string;
}) {
  const t = useMessages().athlete.training;
  const locale = useLocale();
  const config = {
    target: { label: t.target, color: "var(--chart-1)" },
    actual: { label: t.actual, color: "var(--chart-4)" },
  } satisfies ChartConfig;
  const data = weeks.map((w) => ({
    ws: w.weekStart,
    label: formatDate(w.weekStart, locale, { day: "2-digit", month: "2-digit" }),
    target: w.target?.targetLoad ?? 0,
    actual: w.total.load,
    intensity: w.total.intensity ?? "—",
    targetIntensity: w.target?.targetIntensity ?? "—",
    character: w.target?.character ?? "",
  }));

  return (
    <ChartContainer config={config} className="aspect-[2/1] w-full md:aspect-[5/1]">
      <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barGap={2}>
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={6} fontSize={10} />
        <YAxis tickLine={false} axisLine={false} width={28} fontSize={10} allowDecimals={false} />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(_, p) => {
                const d = p[0]?.payload as (typeof data)[number] | undefined;
                return d ? `${d.label} ${d.character} · I ${d.intensity} / ${d.targetIntensity}` : "";
              }}
            />
          }
        />
        <Bar dataKey="target" fill="var(--color-target)" radius={2} isAnimationActive={false} />
        <Bar dataKey="actual" radius={2} isAnimationActive={false}>
          {data.map((d) => (
            <Cell key={d.ws} fill={d.ws === weekStart ? "var(--chart-5)" : "var(--color-actual)"} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
