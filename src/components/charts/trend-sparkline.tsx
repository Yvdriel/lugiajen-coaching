"use client";

import { Line, LineChart, YAxis } from "recharts";

/**
 * Tiny axis-less sparkline (convention 3 — pure, props only). Fixed size so it
 * SSRs and stays cheap in table rows. Monochrome via `currentColor`. Y domain is
 * pinned 0–100 so sparklines are comparable across kata.
 */
export type TrendSparklineProps = {
  values: number[]; // oldest → newest
  width?: number;
  height?: number;
};

export function TrendSparkline({
  values,
  width = 96,
  height = 32,
}: TrendSparklineProps) {
  if (values.length < 2) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  const data = values.map((v, i) => ({ i, v }));
  return (
    <LineChart
      width={width}
      height={height}
      data={data}
      margin={{ top: 4, right: 2, bottom: 4, left: 2 }}
      className="text-foreground"
    >
      <YAxis hide domain={[0, 100]} />
      <Line
        dataKey="v"
        type="monotone"
        stroke="currentColor"
        strokeWidth={1.5}
        dot={false}
        isAnimationActive={false}
      />
    </LineChart>
  );
}
