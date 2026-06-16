import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getMessages } from "@/i18n/server";
import type { AthleteStats } from "@/lib/athlete-stats";

/**
 * Pure presentational stats overview (convention 3). Renders the assembled
 * `AthleteStats` object (built by `lib/athlete-stats.ts`); fetches nothing.
 * `mode` gates sensitive data (physical notes hidden in public).
 */
export type StatsOverviewProps = {
  physical?: {
    heightCm: number | null;
    weightKg: number | null;
    physicalNotes: string | null;
  };
  stats?: AthleteStats;
  mode?: "coach" | "public";
};

const GOAL_KEYS = [
  "goalMain",
  "goalPerformance",
  "goalOutcome",
  "kataFocus",
] as const;

export async function StatsOverview({
  physical,
  stats,
  mode = "coach",
}: StatsOverviewProps) {
  const nl = await getMessages();
  const o = nl.athlete.overview;
  const comp = stats?.competition;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{o.physical}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1 text-sm text-muted-foreground">
          <p>
            {o.height}: {physical?.heightCm ? `${physical.heightCm} cm` : o.none}
          </p>
          <p>
            {o.weight}: {physical?.weightKg ? `${physical.weightKg} kg` : o.none}
          </p>
          {mode === "coach" && physical?.physicalNotes ? (
            <p className="pt-1 text-foreground">{physical.physicalNotes}</p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{o.stats}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          {!comp || comp.totalEvents === 0 ? (
            <p className="text-muted-foreground">{o.noCompetitions}</p>
          ) : (
            <>
              <Line label={o.totalCompetitions} value={comp.totalEvents} />
              <Line
                label={o.podium}
                value={`${comp.podium.first}/${comp.podium.second}/${comp.podium.third}`}
              />
              <Line
                label={o.mostKata}
                value={comp.mostKata ?? o.none}
              />
              {comp.byType.length > 0 ? (
                <div>
                  <p className="text-xs text-muted-foreground">{o.perType}</p>
                  <ul className="flex flex-col">
                    {comp.byType.map((t) => (
                      <li key={t.type} className="flex justify-between">
                        <span>{nl.competition.types[t.type]}</span>
                        <span className="tabular-nums">{t.count}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {comp.rounds.length > 0 ? (
                <div>
                  <p className="text-xs text-muted-foreground">{o.perRound}</p>
                  <ul className="flex flex-col">
                    {comp.rounds.map((r) => (
                      <li key={r.labelKey} className="flex justify-between">
                        <span>{nl.competition.rounds[r.labelKey]}</span>
                        <span className="tabular-nums">
                          {r.wins}–{r.losses}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{o.currentRepertoire}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          {!stats || stats.repertoire.length === 0 ? (
            <p className="text-muted-foreground">{o.noRepertoire}</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {stats.repertoire.map((k) => (
                <li key={k.kataName} className="flex justify-between">
                  <span>{k.kataName}</span>
                  <span className="text-muted-foreground tabular-nums">
                    {nl.kata.proficiency} {k.proficiency}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{o.activeGoals}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          {!stats?.goals ? (
            <p className="text-muted-foreground">{o.noGoals}</p>
          ) : (
            GOAL_KEYS.filter((k) => stats.goals?.[k]).map((k) => (
              <div key={k} className="flex flex-col gap-0.5">
                <span className="text-xs font-medium text-muted-foreground">
                  {nl.feedback.fields[k]}
                </span>
                <span>{stats.goals?.[k]}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="sm:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">{o.focusPoints}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          {!stats || stats.focusPoints.length === 0 ? (
            <p className="text-muted-foreground">{o.noFocus}</p>
          ) : (
            <ul className="list-inside list-disc flex flex-col gap-1">
              {stats.focusPoints.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Line({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
