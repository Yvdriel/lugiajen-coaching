"use client";

import { Badge } from "@/components/ui/badge";
import {
  blockIntensity,
  blockLoad,
  blockVolume,
  isKataBlock,
} from "@/features/training/vli";
import { repsLabel, sectionsArrow } from "@/features/training/week-view";
import { useMessages } from "@/i18n/client";
import type { BlockRow } from "@/lib/queries/training";
import { cn } from "@/lib/utils";

function fmtRest(sec: number | null): string | null {
  if (sec == null) return null;
  return sec >= 60 && sec % 60 === 0 ? `${sec / 60}min` : `${sec}s`;
}

/**
 * One block in sheet notation. `cell` = grid cell content (the image's rows),
 * `card` = session detail with VLI numbers. coachNotes only when mode is coach.
 */
export function BlockLine({
  block: b,
  mode,
  variant,
}: {
  block: BlockRow;
  mode: "coach" | "public";
  variant: "cell" | "card";
}) {
  const t = useMessages().athlete.training;
  const kata = isKataBlock(b);
  const meta: string[] = [];
  if (kata) {
    const rr = fmtRest(b.restRepSec);
    const rs = fmtRest(b.restSectionSec);
    if (rr) meta.push(`${rr} ${t.restRep}`);
    if (rs) meta.push(`${rs} ${t.restSection}`);
    if (b.rounds > 1) meta.push(`${b.rounds} ${t.rounds}`);
  } else if (b.minutes != null) {
    meta.push(`${b.minutes} ${t.min}`);
  }
  if (b.notes) meta.push(b.notes);

  return (
    <div
      className={cn(
        "flex flex-col gap-0.5",
        b.skipped && "text-muted-foreground line-through",
      )}
    >
      <p className="text-sm leading-snug">
        <span className="font-semibold">{kata ? b.kataName : b.label}</span>
        {kata ? (
          <span className="text-muted-foreground">
            {" · "}
            {sectionsArrow(b)}
            {" · "}
            <span className="text-foreground">{repsLabel(b)}</span>
          </span>
        ) : null}
        {b.vest ? (
          <Badge variant="outline" className="ml-2 align-middle">
            {t.vest}
          </Badge>
        ) : null}
        {b.skipped ? (
          <Badge variant="secondary" className="ml-2 align-middle no-underline">
            {t.skipped}
          </Badge>
        ) : null}
      </p>
      {meta.length > 0 ? (
        <p className="text-xs text-muted-foreground">{meta.join(" · ")}</p>
      ) : null}
      {variant === "card" && kata ? (
        <p className="text-xs tabular-nums text-muted-foreground">
          V {blockVolume(b)} · L {blockLoad(b)} · I {blockIntensity(b) ?? "—"}
        </p>
      ) : null}
      {variant === "card" && mode === "coach" && b.coachNotes ? (
        <p className="text-xs whitespace-pre-wrap text-muted-foreground">
          {t.coachNotes}: {b.coachNotes}
        </p>
      ) : null}
    </div>
  );
}
