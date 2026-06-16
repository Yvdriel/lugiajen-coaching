"use client";

import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
} from "recharts";
import { type ChartConfig, ChartContainer } from "@/components/ui/chart";
import { NUMERIC_CRITERIA } from "@/features/scoring/criteria";
import { useMessages } from "@/i18n/client";
import type { ScoringCardRow } from "@/lib/queries/scoring";

/**
 * Radar of the latest card's 12 WKF criteria (technical + athletic, excluding the
 * overall-impression summary). Pure (props only); monochrome via the grayscale
 * `--chart-*` brand tokens.
 */
const RADAR_CRITERIA = NUMERIC_CRITERIA.filter((c) => c.group !== "overall");

export function ScoreRadarChart({ card }: { card: ScoringCardRow }) {
  const nl = useMessages();
  const config = {
    score: { label: nl.scoring.charts.currentScores, color: "var(--chart-4)" },
  } satisfies ChartConfig;
  const data = RADAR_CRITERIA.map((c) => ({
    criterion: nl.scoring.criteria[c.key],
    score: card[c.key] as number,
  }));

  return (
    <ChartContainer config={config} className="mx-auto aspect-square max-h-72">
      <RadarChart data={data} outerRadius="70%">
        <PolarGrid />
        <PolarAngleAxis dataKey="criterion" tick={{ fontSize: 10 }} />
        <PolarRadiusAxis domain={[0, 10]} tick={false} axisLine={false} />
        <Radar
          dataKey="score"
          stroke="var(--color-score)"
          fill="var(--color-score)"
          fillOpacity={0.25}
        />
      </RadarChart>
    </ChartContainer>
  );
}
