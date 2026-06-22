// Pure, env-free Cloudflare Stream webhook helpers — verification + parsing.
// Kept separate from the route handler so they unit-test without env/db. node:crypto
// works under the default vitest (jsdom) env, so no node-env docblock is needed.
import { createHmac, timingSafeEqual } from "node:crypto";

// Reject notifications whose timestamp is older than this (replay protection).
export const WEBHOOK_TOLERANCE_SECONDS = 5 * 60;

/**
 * Verify a Cloudflare Stream `Webhook-Signature` header.
 * Header format: `time=<unix>,sig1=<hex>`. The signed message is
 * `${time}.${rawBody}`, HMAC-SHA256 with the subscription secret. `now` (seconds)
 * is injectable for deterministic tests.
 */
export function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null | undefined,
  secret: string | undefined,
  now: number = Math.floor(Date.now() / 1000),
): boolean {
  if (!secret || !signatureHeader) return false;

  const parts = new Map<string, string>();
  for (const segment of signatureHeader.split(",")) {
    const idx = segment.indexOf("=");
    if (idx === -1) continue;
    parts.set(segment.slice(0, idx).trim(), segment.slice(idx + 1).trim());
  }
  const time = parts.get("time");
  const sig1 = parts.get("sig1");
  if (!time || !sig1) return false;

  // Replay window: reject stale (or absurdly future) timestamps.
  const ts = Number(time);
  if (!Number.isFinite(ts) || Math.abs(now - ts) > WEBHOOK_TOLERANCE_SECONDS) {
    return false;
  }

  const expected = createHmac("sha256", secret)
    .update(`${time}.${rawBody}`)
    .digest("hex");

  // Constant-time compare; bail if lengths differ (timingSafeEqual throws otherwise).
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(sig1, "hex");
  if (a.length !== b.length || a.length === 0) return false;
  return timingSafeEqual(a, b);
}

export type StreamEvent = {
  uid: string;
  state: string; // status.state — "ready" | "error" | ...
  readyToStream: boolean;
  durationSeconds: number | null;
  thumbnail: string | null;
  meta: Record<string, string>;
};

/** Parse a verified Stream webhook body into the fields we persist. */
export function parseStreamEvent(rawBody: string): StreamEvent | null {
  let data: unknown;
  try {
    data = JSON.parse(rawBody);
  } catch {
    return null;
  }
  if (typeof data !== "object" || data === null) return null;
  const d = data as Record<string, unknown>;
  const uid = typeof d.uid === "string" ? d.uid : null;
  if (!uid) return null;
  const status = (d.status ?? {}) as Record<string, unknown>;
  const duration = typeof d.duration === "number" ? d.duration : null;
  return {
    uid,
    state: typeof status.state === "string" ? status.state : "unknown",
    readyToStream: d.readyToStream === true,
    durationSeconds: duration !== null && duration >= 0 ? duration : null,
    thumbnail: typeof d.thumbnail === "string" ? d.thumbnail : null,
    meta:
      typeof d.meta === "object" && d.meta !== null
        ? (d.meta as Record<string, string>)
        : {},
  };
}
