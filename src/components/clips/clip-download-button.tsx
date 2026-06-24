"use client";

import { useState, useTransition } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  type ClipDownloadState,
  requestClipDownload,
} from "@/features/clips/actions";
import { useMessages } from "@/i18n/client";

/**
 * "Download origineel" for the Kinovea loop. Asks Cloudflare to generate the MP4,
 * then polls (via the same idempotent action) until it's ready and offers the
 * download link. The bytes come straight from Cloudflare — never through us.
 */
export function ClipDownloadButton({ clipId }: { clipId: string }) {
  const c = useMessages().clips;
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<ClipDownloadState | null>(null);

  function request() {
    startTransition(async () => {
      setState(await requestClipDownload(clipId));
    });
  }

  const ready = state?.ok && state.status === "ready" && state.url;

  return (
    <div className="flex flex-col items-start gap-1.5">
      {ready ? (
        <a
          href={state.url}
          download
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          {c.download}
        </a>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={request}
        >
          {state?.ok && state.status !== "ready"
            ? c.downloadRefresh
            : c.download}
        </Button>
      )}

      {state?.ok && state.status !== "ready" ? (
        <p className="text-xs text-muted-foreground">{c.downloadPreparing}</p>
      ) : null}
      {state && !state.ok ? (
        <p className="text-xs text-destructive">{state.message}</p>
      ) : null}
    </div>
  );
}
