import { Fragment } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CRITERION_GROUPS,
  criteriaForGroup,
  formatDelta,
} from "@/features/scoring/criteria";
import type { ScoringCardRow } from "@/lib/queries/scoring";
import { cn } from "@/lib/utils";
import { nl } from "@/messages/nl";

/**
 * Pure presentational bulk history table (convention 3): all 13 criteria (rows) ×
 * assessment dates (columns, newest-first). Each cell shows the value and its delta
 * vs the next-older assessment, color-coded green (improved) / red (declined) — the
 * one CLAUDE-mandated functional color exception to the monochrome brand.
 */
export type ScoreHistoryTableProps = {
  history: ScoringCardRow[]; // newest-first (see lib/queries/scoring)
};

function fmtDate(d: string): string {
  return new Date(d).toLocaleDateString("nl-NL");
}

export function ScoreHistoryTable({ history }: ScoreHistoryTableProps) {
  if (history.length === 0) {
    return <p className="text-sm text-muted-foreground">{nl.scoring.noCards}</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{nl.scoring.criterion}</TableHead>
          {history.map((card) => (
            <TableHead key={card.id} className="text-right">
              {fmtDate(card.assessmentDate)}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {CRITERION_GROUPS.map((group) => (
          <Fragment key={group}>
            <TableRow>
              <TableCell
                colSpan={history.length + 1}
                className="bg-muted/50 text-xs font-medium uppercase tracking-wide text-muted-foreground"
              >
                {nl.scoring.groups[group]}
              </TableCell>
            </TableRow>
            {criteriaForGroup(group).map((c) => (
              <TableRow key={c.key}>
                <TableCell>{nl.scoring.criteria[c.key]}</TableCell>
                {history.map((card, i) => {
                  const val = card[c.key] as number;
                  const older = history[i + 1];
                  const delta = older ? val - (older[c.key] as number) : null;
                  const up = delta != null && delta > 0;
                  const down = delta != null && delta < 0;
                  return (
                    <TableCell
                      key={card.id}
                      className={cn(
                        "text-right tabular-nums",
                        up &&
                          "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
                        down &&
                          "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400",
                      )}
                    >
                      {val}
                      {delta != null && delta !== 0 ? (
                        <span className="ml-1 text-xs">{formatDelta(delta)}</span>
                      ) : null}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </Fragment>
        ))}
      </TableBody>
    </Table>
  );
}
