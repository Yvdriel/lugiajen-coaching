"use client";

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { ScoringCardRow } from "@/lib/queries/scoring";
import { nl } from "@/messages/nl";

/**
 * Overall-impression trend over assessment dates (oldest→newest). Pure (props only);
 * monochrome via the grayscale `--chart-*` brand tokens.
 */
const config = {
  overall: {
    label: nl.scoring.criteria.overallImpression,
    color: "var(--chart-4)",
  },
} satisfies ChartConfig;

function fmtShort(d: string): string {
  return new Date(d).toLocaleDateString("nl-NL", {
    day: "2-digit",
    month: "2-digit",
  });
}

export function ScoreTrendChart({ history }: { history: ScoringCardRow[] }) {
  // history is newest-first; chart left→right oldest→newest.
  const data = [...history].reverse().map((c) => ({
    date: fmtShort(c.assessmentDate),
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
