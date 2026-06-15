import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CompetitionListItem } from "@/lib/queries/competitions";
import { nl } from "@/messages/nl";

/**
 * Pure presentational competition list (convention 3). Row affordances (open / edit)
 * are injected by the parent via `actions`; this component imports no server actions.
 */
export type CompetitionListProps = {
  items: CompetitionListItem[];
  actions?: (item: CompetitionListItem) => ReactNode;
};

function fmtDate(d: string): string {
  return new Date(d).toLocaleDateString("nl-NL");
}

export function CompetitionList({ items, actions }: CompetitionListProps) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">{nl.competition.empty}</p>
    );
  }
  const c = nl.competition;
  const showActions = Boolean(actions);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{c.fields.name}</TableHead>
          <TableHead>{c.fields.date}</TableHead>
          <TableHead>{c.fields.type}</TableHead>
          <TableHead>{c.fields.location}</TableHead>
          <TableHead className="text-right">{c.entryCount}</TableHead>
          {showActions ? <TableHead className="text-right" /> : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((it) => (
          <TableRow key={it.id}>
            <TableCell className="font-medium">{it.name}</TableCell>
            <TableCell>{fmtDate(it.date)}</TableCell>
            <TableCell>
              <Badge variant="outline">{c.types[it.competitionType]}</Badge>
            </TableCell>
            <TableCell className="text-muted-foreground">
              {it.location ?? "—"}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {it.entryCount}
            </TableCell>
            {showActions ? (
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">{actions?.(it)}</div>
              </TableCell>
            ) : null}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
