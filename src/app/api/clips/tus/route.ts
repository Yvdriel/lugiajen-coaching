import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { clips } from "@/db/schema";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

// tus direct-creator-upload proxy. The browser's tus client sends its CREATION
// request here; we forward it to Cloudflare with the API token attached and relay
// the one-time upload URL back. The video bytes never touch this server — the tus
// client PATCHes chunks straight to the Cloudflare URL returned in `Location`.
export const runtime = "nodejs";

const CF_API_BASE = "https://api.cloudflare.com/client/v4";
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Pull our clips row id out of the tus Upload-Metadata (`key b64value,…`). The
// value is client-controlled, so only accept a well-formed UUID.
function parseClipId(uploadMetadata: string | null): string | null {
  if (!uploadMetadata) return null;
  for (const pair of uploadMetadata.split(",")) {
    const [key, value] = pair.trim().split(" ");
    if (key === "clipid" && value) {
      try {
        const decoded = Buffer.from(value, "base64").toString("utf8");
        return UUID_RE.test(decoded) ? decoded : null;
      } catch {
        return null;
      }
    }
  }
  return null;
}

// Privacy is set at creation time, so we never trust the client to mark the asset
// private. Force `requiresignedurls` into the forwarded metadata regardless of
// what the browser sent.
function withRequireSignedUrls(uploadMetadata: string | null): string {
  const parts = (uploadMetadata ?? "")
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  if (!parts.some((p) => p.split(" ")[0] === "requiresignedurls")) {
    parts.push("requiresignedurls");
  }
  return parts.join(",");
}

export async function POST(req: Request): Promise<Response> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return new Response("Unauthorized", { status: 401 });

  const accountId = env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = env.CLOUDFLARE_STREAM_API_TOKEN;
  if (!accountId || !apiToken) {
    return new Response("Stream not configured", { status: 500 });
  }

  const uploadLength = req.headers.get("Upload-Length");
  const uploadMetadata = req.headers.get("Upload-Metadata");
  const forwardedMetadata = withRequireSignedUrls(uploadMetadata);

  // Create the resumable upload session on Cloudflare (headers only, no body).
  const cfRes = await fetch(
    `${CF_API_BASE}/accounts/${accountId}/stream?direct_user=true`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Tus-Resumable": "1.0.0",
        ...(uploadLength ? { "Upload-Length": uploadLength } : {}),
        "Upload-Metadata": forwardedMetadata,
      },
    },
  );

  const location = cfRes.headers.get("Location");
  const mediaId = cfRes.headers.get("stream-media-id");

  // Record the real Stream uid on our clips row (best-effort; the webhook also
  // correlates via meta.clipid). Guard on status='uploading' so a forged/replayed
  // clipid can't re-point an already-linked clip's assetId.
  const clipId = parseClipId(uploadMetadata);
  if (mediaId && clipId) {
    try {
      await db
        .update(clips)
        .set({ assetId: mediaId })
        .where(and(eq(clips.id, clipId), eq(clips.status, "uploading")));
    } catch {
      // Non-fatal — the webhook will still match on meta.clipid.
    }
  }

  if (!cfRes.ok || !location) {
    return new Response("Upload init failed", { status: 502 });
  }

  return new Response(null, {
    status: 201,
    headers: {
      "Tus-Resumable": "1.0.0",
      Location: location,
      ...(mediaId ? { "stream-media-id": mediaId } : {}),
      "Access-Control-Expose-Headers": "Location, stream-media-id",
    },
  });
}

export function OPTIONS(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers":
        "Authorization, Tus-Resumable, Upload-Length, Upload-Metadata, Upload-Offset, Content-Type",
      "Access-Control-Expose-Headers": "Location, stream-media-id",
    },
  });
}
