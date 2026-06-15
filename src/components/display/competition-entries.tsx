import type { ReactNode } from "react";
import { EntryBody } from "@/components/display/competition-entry-view";
import type { CompetitionEntryRow } from "@/lib/queries/competitions";
import { nl } from "@/messages/nl";

/**
 * Pure presentational list of a competition's entries (convention 3). Per-entry
 * affordances (edit / remove) are injected by the parent via `actions`.
 */
export type CompetitionEntriesProps = {
  entries: CompetitionEntryRow[];
  kataNames: Map<string, string>;
  actions?: (entry: CompetitionEntryRow) => ReactNode;
};

export function CompetitionEntries({
  entries,
  kataNames,
  actions,
}: CompetitionEntriesProps) {
  if (entries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {nl.competition.emptyEntries}
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {entries.map((row) => (
        <li
          key={row.entry.id}
          className="flex flex-col gap-3 rounded-lg border border-border p-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-medium">
                {row.athleteFirstName} {row.athleteLastName}
              </p>
              <p className="text-sm text-muted-foreground">
                {row.entry.category}
              </p>
            </div>
            {actions ? (
              <div className="flex gap-1">{actions(row)}</div>
            ) : null}
          </div>
          <EntryBody entry={row.entry} kataNames={kataNames} />
        </li>
      ))}
    </ul>
  );
}
