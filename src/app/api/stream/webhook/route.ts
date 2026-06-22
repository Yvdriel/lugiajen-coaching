import { and, eq, ne, or, type SQL } from "drizzle-orm";
import { clips } from "@/db/schema";
import {
  parseStreamEvent,
  verifyWebhookSignature,
} from "@/features/clips/webhook";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

// Cloudflare Stream ingest webhook. Register this URL in the Cloudflare dashboard
// (or via PUT .../stream/webhook): <your-domain>/api/stream/webhook.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: Request): Promise<Response> {
  // Verify against the RAW body — must read it before any parsing.
  const raw = await req.text();
  const signature = req.headers.get("Webhook-Signature");
  if (
    !verifyWebhookSignature(
      raw,
      signature,
      env.CLOUDFLARE_STREAM_WEBHOOK_SECRET,
    )
  ) {
    return new Response("Invalid signature", { status: 401 });
  }

  const event = parseStreamEvent(raw);
  if (!event) return new Response("Bad payload", { status: 400 });

  // Match the clip by the Stream uid, falling back to our clipid in meta (the uid
  // may still be the placeholder if the tus proxy didn't record it). meta.clipid is
  // client-controlled, so only use it when it's a well-formed UUID — otherwise the
  // `clips.id` cast would throw and 500 the webhook into a retry loop.
  const clipId =
    typeof event.meta.clipid === "string" && UUID_RE.test(event.meta.clipid)
      ? event.meta.clipid
      : null;
  const match: SQL | undefined = clipId
    ? or(eq(clips.assetId, event.uid), eq(clips.id, clipId))
    : eq(clips.assetId, event.uid);

  if (event.state === "ready" && event.readyToStream) {
    await db
      .update(clips)
      .set({
        status: "ready",
        assetId: event.uid,
        durationMs:
          event.durationSeconds != null
            ? Math.round(event.durationSeconds * 1000)
            : null,
        thumbnailUrl: event.thumbnail,
      })
      // Idempotent: repeated ready deliveries are no-ops.
      .where(and(match, ne(clips.status, "ready")));
  } else if (event.state === "error") {
    await db.update(clips).set({ status: "error" }).where(match);
  }

  return new Response("ok", { status: 200 });
}
