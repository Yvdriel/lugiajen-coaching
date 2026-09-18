import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/i18n/format";
import { getLocale, getMessages } from "@/i18n/server";
import type { LearningRow } from "@/lib/queries/training";

/**
 * Pure presentational learnings list (convention 3). Coach-only in practice: the
 * portal never loads learnings. `actions` injects the delete button.
 */
export async function LearningsList({
  items,
  actions,
}: {
  items: LearningRow[];
  actions?: (item: LearningRow) => ReactNode;
}) {
  const nl = await getMessages();
  const locale = await getLocale();
  const t = nl.athlete.learnings;
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">{t.empty}</p>;
  }
  return (
    <ul className="flex flex-col gap-2">
      {items.map((l) => (
        <li key={l.id} className="rounded-md border border-border p-3 text-sm">
          <div className="flex items-start justify-between gap-2">
            <p className="whitespace-pre-wrap">{l.body}</p>
            {actions ? <div className="shrink-0">{actions(l)}</div> : null}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
            <Badge variant="outline">
              {l.author === "ai" ? t.byAi : t.byCoach}
            </Badge>
            {l.athleteId === null ? (
              <Badge variant="secondary">{t.global}</Badge>
            ) : null}
            {l.tags.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
            <time className="ml-auto">
              {formatDateTime(l.createdAt, locale)}
            </time>
          </div>
        </li>
      ))}
    </ul>
  );
}
