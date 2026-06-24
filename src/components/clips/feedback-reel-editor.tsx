"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  attachClipToFeedback,
  detachFeedbackClip,
  reorderFeedbackClips,
  updateFeedbackClipCaption,
} from "@/features/feedback/reel-actions";
import { type Direction, moveInOrder } from "@/features/feedback/reel-order";
import type { ReelClipRow } from "@/lib/queries/feedback";
import { useMessages } from "@/i18n/client";

export type AvailableClip = {
  id: string;
  label: string | null;
  kataName: string | null;
  kind: ReelClipRow["kind"];
};

// Coach-only reel curation: attach a ready clip, caption it, reorder with ▲/▼,
// detach. Each mutation is a server action; on success we router.refresh() so the
// server-rendered reel + player re-read.
export function FeedbackReelEditor({
  feedbackId,
  reel,
  available,
}: {
  feedbackId: string;
  reel: ReelClipRow[];
  available: AvailableClip[];
}) {
  const nl = useMessages();
  const r = nl.feedback.reel;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selectedClipId, setSelectedClipId] = useState("");
  const [caption, setCaption] = useState("");
  const [error, setError] = useState<string | null>(null);

  const orderedIds = reel.map((row) => row.feedbackClipId);

  function run(fn: () => Promise<{ ok: boolean; message?: string }>) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) setError(res.message ?? nl.error.title);
      else router.refresh();
    });
  }

  function attach() {
    if (!selectedClipId) return;
    run(async () => {
      const res = await attachClipToFeedback(feedbackId, selectedClipId, caption);
      if (res.ok) {
        setSelectedClipId("");
        setCaption("");
      }
      return res;
    });
  }

  function move(feedbackClipId: string, dir: Direction) {
    const next = moveInOrder(orderedIds, feedbackClipId, dir);
    if (next.join() === orderedIds.join()) return; // edge — nothing to do
    run(() => reorderFeedbackClips(feedbackId, next));
  }

  function clipName(label: string | null, kataName: string | null): string {
    return label || kataName || r.clip;
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Attach a ready clip */}
      <div className="flex flex-col gap-2 rounded-lg border border-border p-4">
        {available.length === 0 ? (
          <p className="text-sm text-muted-foreground">{r.noAvailable}</p>
        ) : (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex flex-1 flex-col gap-1.5">
              <label htmlFor="reel-clip" className="text-sm font-medium">
                {r.attach}
              </label>
              <select
                id="reel-clip"
                value={selectedClipId}
                onChange={(e) => setSelectedClipId(e.target.value)}
                disabled={pending}
                className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
              >
                <option value="">{r.selectClip}</option>
                {available.map((c) => (
                  <option key={c.id} value={c.id}>
                    {clipName(c.label, c.kataName)} · {nl.clips.kind[c.kind]}
                  </option>
                ))}
              </select>
            </div>
            <Input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder={r.captionPlaceholder}
              disabled={pending}
              className="flex-1"
            />
            <Button
              type="button"
              size="sm"
              disabled={pending || !selectedClipId}
              onClick={attach}
            >
              {r.attach}
            </Button>
          </div>
        )}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>

      {/* The reel, in order */}
      {reel.length === 0 ? (
        <p className="text-sm text-muted-foreground">{r.empty}</p>
      ) : (
        <ol className="flex flex-col gap-2">
          {reel.map((row, idx) => (
            <ReelRow
              key={row.feedbackClipId}
              row={row}
              index={idx}
              last={idx === reel.length - 1}
              pending={pending}
              onMove={(dir) => move(row.feedbackClipId, dir)}
              onDetach={() =>
                run(() => detachFeedbackClip(row.feedbackClipId))
              }
              onCaption={(value) =>
                run(() =>
                  updateFeedbackClipCaption(row.feedbackClipId, value),
                )
              }
              name={clipName(row.label, row.kataName)}
            />
          ))}
        </ol>
      )}
    </div>
  );
}

function ReelRow({
  row,
  index,
  last,
  pending,
  onMove,
  onDetach,
  onCaption,
  name,
}: {
  row: ReelClipRow;
  index: number;
  last: boolean;
  pending: boolean;
  onMove: (dir: Direction) => void;
  onDetach: () => void;
  onCaption: (value: string) => void;
  name: string;
}) {
  const nl = useMessages();
  const r = nl.feedback.reel;
  const [caption, setCaption] = useState(row.caption ?? "");
  const dirty = caption !== (row.caption ?? "");

  return (
    <li className="flex flex-col gap-2 rounded-md border border-border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">{index + 1}</span>
        <span className="text-sm font-medium">{name}</span>
        <Badge variant="secondary">{nl.clips.kind[row.kind]}</Badge>
        {row.status !== "ready" ? (
          <Badge variant="outline">{nl.clips.status[row.status]}</Badge>
        ) : null}
        <Badge variant="outline">
          {row.addedBy === "athlete" ? r.addedByAthlete : r.addedByCoach}
        </Badge>
        <div className="ml-auto flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label={r.moveUp}
            disabled={pending || index === 0}
            onClick={() => onMove("up")}
          >
            ▲
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label={r.moveDown}
            disabled={pending || last}
            onClick={() => onMove("down")}
          >
            ▼
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => {
              if (window.confirm(r.confirmDetach)) onDetach();
            }}
          >
            {r.detach}
          </Button>
        </div>
      </div>
      <div className="flex gap-2">
        <Input
          type="text"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder={r.captionPlaceholder}
          disabled={pending}
          aria-label={r.caption}
        />
        {dirty ? (
          <Button
            type="button"
            size="sm"
            disabled={pending}
            onClick={() => onCaption(caption)}
          >
            {nl.common.save}
          </Button>
        ) : null}
      </div>
    </li>
  );
}
