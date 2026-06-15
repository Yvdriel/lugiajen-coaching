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
import { nl } from "@/messages/nl";

/**
 * Pure presentational bulk history table (convention 3): all 13 criteria (rows) ×
 * assessment dates (columns, newest-first). Each cell shows the value and its delta
 * vs the next-older assessment. Plain text now — Ch6 adds color coding + sparklines.
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
                  return (
                    <TableCell
                      key={card.id}
                      className="text-right tabular-nums"
                    >
                      {val}
                      {delta != null && delta !== 0 ? (
                        <span className="ml-1 text-xs text-muted-foreground">
                          {formatDelta(delta)}
                        </span>
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
