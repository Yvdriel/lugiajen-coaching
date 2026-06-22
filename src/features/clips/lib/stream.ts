// Server-only Cloudflare Stream provider client. Reads secrets from env; never
// logs them and never returns them to the client. This module reads process.env
// (via @/lib/env) so it must only be imported from server code.
//
// Endpoint shapes were verified against the live Cloudflare Stream docs. If they
// drift, re-check before editing:
//   - direct creator upload:  /stream/uploading-videos/direct-creator-uploads/
//   - signed URLs / keys:      /stream/viewing-videos/securing-your-stream/
//   - downloads:               /stream/viewing-videos/download-videos/
import { env } from "@/lib/env";
import { createPlaybackToken } from "./stream-token";

// Re-export the pure signer so callers can reach it from the client module too.
export { createPlaybackToken } from "./stream-token";

const CF_API_BASE = "https://api.cloudflare.com/client/v4";

// Cloudflare's standard response envelope.
type CfEnvelope<T> = {
  success: boolean;
  errors?: { code: number; message: string }[];
  result: T;
};

function requireStreamConfig(): { accountId: string; apiToken: string } {
  const accountId = env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = env.CLOUDFLARE_STREAM_API_TOKEN;
  if (!accountId || !apiToken) {
    throw new Error(
      "Cloudflare Stream is not configured (set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_STREAM_API_TOKEN).",
    );
  }
  return { accountId, apiToken };
}

function requireSubdomain(): string {
  const sub = env.CLOUDFLARE_STREAM_CUSTOMER_SUBDOMAIN;
  if (!sub) {
    throw new Error(
      "Cloudflare Stream playback is not configured (set CLOUDFLARE_STREAM_CUSTOMER_SUBDOMAIN).",
    );
  }
  return sub;
}

function errorDetail(errors?: { code: number; message: string }[]): string {
  const detail = errors?.map((e) => `${e.code}:${e.message}`).join(", ");
  return detail ? `: ${detail}` : "";
}

// Thin wrapper around the Cloudflare API: attaches the account path + bearer
// token. Throws on non-2xx or success:false. Error messages carry the HTTP
// status and Cloudflare's error codes only — never the token.
async function cfFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const { accountId, apiToken } = requireStreamConfig();
  const res = await fetch(`${CF_API_BASE}/accounts/${accountId}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiToken}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  if (!res.ok) {
    let detail = "";
    try {
      const body = (await res.json()) as CfEnvelope<unknown>;
      detail = errorDetail(body.errors);
    } catch {
      // body wasn't JSON — status alone is enough
    }
    throw new Error(
      `Cloudflare Stream request failed (${res.status})${detail}`,
    );
  }
  const body = (await res.json()) as CfEnvelope<T>;
  if (!body.success) {
    throw new Error(`Cloudflare Stream error${errorDetail(body.errors)}`);
  }
  return body.result;
}

export type DirectUpload = { uid: string; uploadURL: string };

/**
 * Create a one-time direct creator upload. Returns the new video `uid` and the
 * `uploadURL` the client uploads to (the bytes never pass through our server).
 * Always defaults requireSignedURLs to true — assets are private by default.
 *
 * NOTE (Session 2): this uses the basic `/direct_upload` endpoint. True
 * resumable tus uploads use `POST /stream?direct_user=true` (client supplies
 * Upload-Length/Upload-Metadata; server relays the Location + stream-media-id
 * headers). That choice belongs to the Session 2 upload UI.
 */
export async function createDirectUpload(opts: {
  maxDurationSeconds: number;
  requireSignedURLs?: boolean;
  meta?: Record<string, string>;
}): Promise<DirectUpload> {
  const { maxDurationSeconds, requireSignedURLs = true, meta } = opts;
  const result = await cfFetch<DirectUpload>("/stream/direct_upload", {
    method: "POST",
    body: JSON.stringify({
      maxDurationSeconds,
      requireSignedURLs,
      ...(meta ? { meta } : {}),
    }),
  });
  return { uid: result.uid, uploadURL: result.uploadURL };
}

/** Short-lived signed playback token for a video uid, using the env signing key. */
export async function getSignedPlaybackToken(
  uid: string,
  opts?: { expSeconds?: number },
): Promise<string> {
  const keyId = env.CLOUDFLARE_STREAM_SIGNING_KEY_ID;
  const pemBase64 = env.CLOUDFLARE_STREAM_SIGNING_KEY_PEM;
  if (!keyId || !pemBase64) {
    throw new Error(
      "Cloudflare Stream signing key is not configured (set CLOUDFLARE_STREAM_SIGNING_KEY_ID and CLOUDFLARE_STREAM_SIGNING_KEY_PEM).",
    );
  }
  return createPlaybackToken({
    uid,
    keyId,
    privateKeyPemBase64: pemBase64,
    expSeconds: opts?.expSeconds,
  });
}

export type DownloadInfo = {
  status: string; // "inprogress" | "ready" | "error"
  url: string;
  percentComplete: number;
};

/** Trigger MP4 generation for a video. Returns the `default` download record. */
export async function enableDownload(uid: string): Promise<DownloadInfo> {
  const result = await cfFetch<{ default: DownloadInfo }>(
    `/stream/${uid}/downloads`,
    { method: "POST" },
  );
  return result.default;
}

/** Current MP4 download status (null until a download has been enabled). */
export async function getDownloadStatus(
  uid: string,
): Promise<DownloadInfo | null> {
  const result = await cfFetch<{ default?: DownloadInfo }>(
    `/stream/${uid}/downloads`,
    { method: "GET" },
  );
  return result.default ?? null;
}

export type VideoDetails = {
  state: string; // "ready" | "inprogress" | "queued" | "error" | "pendingupload"
  readyToStream: boolean;
  durationSeconds: number | null;
  thumbnail: string | null;
};

/**
 * Current processing state of a video. Used by the status-sync fallback so a coach
 * can flip a clip to ready locally without a reachable webhook.
 */
export async function getVideoDetails(uid: string): Promise<VideoDetails> {
  const result = await cfFetch<{
    status?: { state?: string };
    readyToStream?: boolean;
    duration?: number;
    thumbnail?: string;
  }>(`/stream/${uid}`, { method: "GET" });
  return {
    state: result.status?.state ?? "unknown",
    readyToStream: result.readyToStream ?? false,
    // Cloudflare reports -1 until the duration is known.
    durationSeconds:
      typeof result.duration === "number" && result.duration >= 0
        ? result.duration
        : null,
    thumbnail: result.thumbnail ?? null,
  };
}

/** Permanently delete a Stream asset. */
export async function deleteAsset(uid: string): Promise<void> {
  await cfFetch<unknown>(`/stream/${uid}`, { method: "DELETE" });
}

function customerBase(): string {
  // Accept either the bare code ("customer-xxxx") or the full host
  // ("customer-xxxx.cloudflarestream.com", optionally with a scheme).
  const raw = requireSubdomain()
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/+$/, "");
  const host = raw.endsWith(".cloudflarestream.com")
    ? raw
    : `${raw}.cloudflarestream.com`;
  return `https://${host}`;
}

/** Thumbnail JPEG for a video uid. */
export function thumbnailUrl(
  uid: string,
  opts?: { time?: string; height?: number; width?: number },
): string {
  const url = new URL(`${customerBase()}/${uid}/thumbnails/thumbnail.jpg`);
  if (opts?.time) url.searchParams.set("time", opts.time);
  if (opts?.height) url.searchParams.set("height", String(opts.height));
  if (opts?.width) url.searchParams.set("width", String(opts.width));
  return url.toString();
}

// For signed playback the path segment is the signed TOKEN, not the uid.
/** Stream player iframe URL for a signed playback token. */
export function iframeUrl(token: string): string {
  return `${customerBase()}/${token}/iframe`;
}

/** HLS manifest URL for a signed playback token. */
export function hlsUrl(token: string): string {
  return `${customerBase()}/${token}/manifest/video.m3u8`;
}
