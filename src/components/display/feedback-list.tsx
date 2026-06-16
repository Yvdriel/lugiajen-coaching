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
import { formatDate } from "@/i18n/format";
import { getLocale, getMessages } from "@/i18n/server";
import type { FeedbackRow } from "@/lib/queries/feedback";

/**
 * Pure presentational feedback list (convention 3): chronological rows. Per-row
 * affordances (Bekijken) are injected by the parent via `actions`; this component
 * imports no server actions and renders no links. Ch10's public portal reuses it.
 */
export type FeedbackListProps = {
  items: FeedbackRow[];
  actions?: (item: FeedbackRow) => ReactNode;
};

export async function FeedbackList({ items, actions }: FeedbackListProps) {
  const nl = await getMessages();
  const locale = await getLocale();
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">{nl.feedback.empty}</p>;
  }
  const showActions = Boolean(actions);
  const f = nl.feedback;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{f.date}</TableHead>
          <TableHead>{f.meeting}</TableHead>
          <TableHead>{f.season}</TableHead>
          <TableHead>{f.type}</TableHead>
          {showActions ? <TableHead className="text-right" /> : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((it) => (
          <TableRow key={it.id}>
            <TableCell>{formatDate(it.meetingDate, locale)}</TableCell>
            <TableCell className="tabular-nums">{it.meetingNumber}</TableCell>
            <TableCell className="text-muted-foreground">{it.season}</TableCell>
            <TableCell>
              <Badge variant="outline">{it.formType}</Badge>
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
