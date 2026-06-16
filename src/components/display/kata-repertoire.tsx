import type { ReactNode } from "react";
import { TrendSparkline } from "@/components/charts/trend-sparkline";
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
import type { AthleteKataItem } from "@/lib/queries/kata";

/**
 * Pure presentational kata repertoire (convention 3): data via props + `mode`.
 * Per-row affordances (score / edit / remove) are injected by the parent via the
 * `actions` render slot — this component imports no server actions and renders no links.
 * Ch10's public portal reuses it with `mode="public"` and no `actions`.
 */
export type KataRepertoireItem = AthleteKataItem & {
  lastAssessmentDate: string | null;
  trend: number[]; // overall-impression trajectory, oldest→newest
};

export type KataRepertoireProps = {
  items: KataRepertoireItem[];
  mode?: "coach" | "public";
  actions?: (item: KataRepertoireItem) => ReactNode;
};

export async function KataRepertoire({
  items,
  mode = "coach",
  actions,
}: KataRepertoireProps) {
  const nl = await getMessages();
  const locale = await getLocale();
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">{nl.kata.empty}</p>;
  }

  const showActions = mode === "coach" && Boolean(actions);
  const k = nl.kata;
  const fmtDate = (d: string | null): string =>
    d ? formatDate(d, locale) : k.noAssessment;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{k.title}</TableHead>
          <TableHead>{k.flexCategory}</TableHead>
          <TableHead className="text-right">{k.roundOrder}</TableHead>
          <TableHead className="text-right">{k.proficiency}</TableHead>
          <TableHead>{k.lastAssessment}</TableHead>
          <TableHead>{k.trend}</TableHead>
          {showActions ? <TableHead className="text-right" /> : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow key={item.id}>
            <TableCell>
              <div className="flex items-center gap-2">
                <span className="font-medium">{item.kataName}</span>
                {item.isCompetitionKata ? (
                  <Badge variant="secondary">{k.competition}</Badge>
                ) : null}
              </div>
              {mode === "coach" && item.notes ? (
                <p className="mt-0.5 max-w-prose text-xs text-muted-foreground">
                  {item.notes}
                </p>
              ) : null}
            </TableCell>
            <TableCell>
              <Badge variant="outline">{item.flexibilityCategory}</Badge>
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {item.roundOrder ?? "—"}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {item.proficiency}/100
            </TableCell>
            <TableCell className="text-muted-foreground">
              {fmtDate(item.lastAssessmentDate)}
            </TableCell>
            <TableCell>
              <TrendSparkline values={item.trend} />
            </TableCell>
            {showActions ? (
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">{actions?.(item)}</div>
              </TableCell>
            ) : null}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
