import { EntryBody } from "@/components/display/competition-entry-view";
import { Badge } from "@/components/ui/badge";
import { entryKataNames } from "@/features/competitions/entry";
import { summarizeAthleteCompetitions } from "@/features/competitions/summary";
import { formatDate } from "@/i18n/format";
import { getLocale, getMessages } from "@/i18n/server";
import type { AthleteCompetitionRow } from "@/lib/queries/competitions";

/**
 * Pure presentational athlete competition history + summary (convention 3). Read-only;
 * reused by the coach Wedstrijden tab and Ch10's public portal. No session/actions.
 */
export type AthleteCompetitionsProps = {
  rows: AthleteCompetitionRow[];
  kataNames: Map<string, string>;
  mode?: "coach" | "public";
};

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-heading text-xl">{value}</p>
    </div>
  );
}

export async function AthleteCompetitions({
  rows,
  kataNames,
  mode = "coach",
}: AthleteCompetitionsProps) {
  const nl = await getMessages();
  const locale = await getLocale();
  const c = nl.competition;
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">{c.empty}</p>;
  }

  const summary = summarizeAthleteCompetitions(
    rows.map((r) => ({
      placement: r.entry.resultPlacement,
      katas: entryKataNames(r.entry, kataNames),
    })),
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label={c.summary.totalEvents} value={summary.totalEvents} />
        <Stat
          label={c.summary.podium}
          value={`${summary.podium.first}/${summary.podium.second}/${summary.podium.third}`}
        />
        <Stat
          label={c.summary.mostKata}
          value={summary.mostKata ?? c.summary.none}
        />
      </div>

      <ul className="flex flex-col gap-3">
        {rows.map((row) => (
          <li
            key={row.entry.id}
            className="flex flex-col gap-3 rounded-lg border border-border p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium">{row.competitionName}</p>
                <p className="text-sm text-muted-foreground">
                  {formatDate(row.competitionDate, locale)} ·{" "}
                  {row.entry.category}
                </p>
              </div>
              <Badge variant="outline">{c.types[row.competitionType]}</Badge>
            </div>
            <EntryBody entry={row.entry} kataNames={kataNames} mode={mode} />
          </li>
        ))}
      </ul>
    </div>
  );
}
