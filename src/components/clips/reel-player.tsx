"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useMessages } from "@/i18n/client";

// Pure presentational reel player (convention 3): props only, no actions, no
// getSession. The signed iframe URL is minted server-side and handed in, so the
// same component plays the reel on the coach page and the public portal.
export type ReelPlayerClip = {
  clipId: string;
  caption: string | null;
  label: string | null;
  kataName: string | null;
  // Signed Stream player URL when the clip is ready; null while it's processing.
  iframeUrl: string | null;
};

function clipTitle(c: ReelPlayerClip, fallback: string): string {
  return c.caption || c.label || c.kataName || fallback;
}

export function ReelPlayer({ clips }: { clips: ReelPlayerClip[] }) {
  const r = useMessages().feedback.reel;
  const [active, setActive] = useState(0);

  if (clips.length === 0) return null;
  const i = Math.min(active, clips.length - 1);
  const current = clips[i];
  const title = clipTitle(current, r.title);

  return (
    <div className="flex flex-col gap-3">
      <div className="aspect-video w-full overflow-hidden rounded-lg border border-border bg-black">
        {current.iframeUrl ? (
          <iframe
            src={current.iframeUrl}
            title={title}
            className="h-full w-full"
            allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
            allowFullScreen
          />
        ) : (
          <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
            {r.processing}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-col">
          <span className="text-sm font-medium">{title}</span>
          {current.kataName ? (
            <span className="text-xs text-muted-foreground">
              {current.kataName}
            </span>
          ) : null}
        </div>
        {clips.length > 1 ? (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={i === 0}
              onClick={() => setActive(i - 1)}
            >
              {r.prev}
            </Button>
            <span className="text-xs text-muted-foreground">
              {i + 1} / {clips.length}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={i === clips.length - 1}
              onClick={() => setActive(i + 1)}
            >
              {r.next}
            </Button>
          </div>
        ) : null}
      </div>

      {clips.length > 1 ? (
        <ol className="flex flex-col gap-1">
          {clips.map((c, idx) => (
            <li key={c.clipId}>
              <button
                type="button"
                onClick={() => setActive(idx)}
                className={`flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left text-sm ${
                  idx === i ? "border-foreground bg-muted" : "border-border"
                }`}
              >
                <span className="text-xs text-muted-foreground">{idx + 1}</span>
                <span className="flex-1 truncate">
                  {clipTitle(c, `${r.clip} ${idx + 1}`)}
                </span>
                {c.iframeUrl ? null : (
                  <Badge variant="secondary">{r.processingShort}</Badge>
                )}
              </button>
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}
