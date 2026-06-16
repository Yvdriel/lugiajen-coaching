import { ScoreRadarChart } from "@/components/charts/score-radar-chart";
import { ScoreTrendChart } from "@/components/charts/score-trend-chart";
import { TrendSparkline } from "@/components/charts/trend-sparkline";
import { ScoreHistoryTable } from "@/components/display/score-history-table";
import { NUMERIC_CRITERIA, formatDelta } from "@/features/scoring/criteria";
import { getMessages } from "@/i18n/server";
import type { ScoringCardRow } from "@/lib/queries/scoring";

/**
 * Pure presentational scoring-card history for one kata (convention 3): radar of
 * the latest card, overall-impression trend, per-criterion sparklines, the full
 * history table, and the latest priority/strengths. Renders no coach-private
 * fields, no links and no actions — the kata picker and "Nieuwe beoordeling"
 * affordance are injected by the parent. Shared by the coach Scorekaarten tab and
 * Ch10's public portal (`mode` not needed: every field here is athlete-facing).
 */
export async function ScoringHistoryPanel({
  history,
}: {
  history: ScoringCardRow[];
}) {
  const nl = await getMessages();
  const latestCard = history[0] ?? null;

  return (
    <div className="flex flex-col gap-6">
      {latestCard ? (
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <h3 className="mb-2 text-sm font-medium">
              {nl.scoring.charts.currentScores}
            </h3>
            <ScoreRadarChart card={latestCard} />
          </div>
          <div>
            <h3 className="mb-2 text-sm font-medium">
              {nl.scoring.charts.trend}
            </h3>
            {history.length >= 2 ? (
              <ScoreTrendChart history={history} />
            ) : (
              <p className="text-sm text-muted-foreground">
                {nl.scoring.charts.needMore}
              </p>
            )}
          </div>
        </div>
      ) : null}

      {history.length >= 2 ? (
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium">
            {nl.scoring.charts.perCriterion}
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {NUMERIC_CRITERIA.map((c) => {
              const series = [...history]
                .reverse()
                .map((card) => card[c.key] as number);
              const latest = series[series.length - 1];
              const delta = latest - series[series.length - 2];
              return (
                <div
                  key={c.key}
                  className="flex flex-col gap-1 rounded-lg border border-border p-2"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      {nl.scoring.criteria[c.key]}
                    </span>
                    <span className="tabular-nums">
                      {latest}
                      {delta !== 0 ? (
                        <span className="ml-1 text-muted-foreground">
                          {formatDelta(delta)}
                        </span>
                      ) : null}
                    </span>
                  </div>
                  <TrendSparkline values={series} width={140} height={36} />
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-medium">{nl.scoring.title}</h3>
        <ScoreHistoryTable history={history} />
      </div>

      {latestCard?.priorityImprovements || latestCard?.strengths ? (
        <div className="flex flex-col gap-2 rounded-lg border border-border p-4 text-sm">
          {latestCard?.priorityImprovements ? (
            <p>
              <span className="font-medium">
                {nl.scoring.textFields.priorityImprovements}:
              </span>{" "}
              {latestCard.priorityImprovements}
            </p>
          ) : null}
          {latestCard?.strengths ? (
            <p>
              <span className="font-medium">
                {nl.scoring.textFields.strengths}:
              </span>{" "}
              {latestCard.strengths}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
