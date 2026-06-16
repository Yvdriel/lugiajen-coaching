"use client";

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { useLocale, useMessages } from "@/i18n/client";
import { formatDate } from "@/i18n/format";
import type { ScoringCardRow } from "@/lib/queries/scoring";

/**
 * Overall-impression trend over assessment dates (oldest→newest). Pure (props only);
 * monochrome via the grayscale `--chart-*` brand tokens.
 */
export function ScoreTrendChart({ history }: { history: ScoringCardRow[] }) {
  const nl = useMessages();
  const locale = useLocale();
  const config = {
    overall: {
      label: nl.scoring.criteria.overallImpression,
      color: "var(--chart-4)",
    },
  } satisfies ChartConfig;

  // history is newest-first; chart left→right oldest→newest.
  const data = [...history].reverse().map((c) => ({
    date: formatDate(c.assessmentDate, locale, {
      day: "2-digit",
      month: "2-digit",
    }),
    overall: c.overallImpression,
  }));

  return (
    <ChartContainer config={config} className="aspect-[3/1] w-full">
      <LineChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis
          domain={[1, 10]}
          ticks={[2, 4, 6, 8, 10]}
          tickLine={false}
          axisLine={false}
          width={28}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Line
          dataKey="overall"
          type="monotone"
          stroke="var(--color-overall)"
          strokeWidth={2}
          dot={{ r: 3 }}
          isAnimationActive={false}
        />
      </LineChart>
    </ChartContainer>
  );
}
