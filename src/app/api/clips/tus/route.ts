import { eq } from "drizzle-orm";
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

// Pull our clips row id out of the tus Upload-Metadata (`key b64value,…`).
function parseClipId(uploadMetadata: string | null): string | null {
  if (!uploadMetadata) return null;
  for (const pair of uploadMetadata.split(",")) {
    const [key, value] = pair.trim().split(" ");
    if (key === "clipid" && value) {
      try {
        return Buffer.from(value, "base64").toString("utf8");
      } catch {
        return null;
      }
    }
  }
  return null;
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

  // Create the resumable upload session on Cloudflare (headers only, no body).
  const cfRes = await fetch(
    `${CF_API_BASE}/accounts/${accountId}/stream?direct_user=true`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Tus-Resumable": "1.0.0",
        ...(uploadLength ? { "Upload-Length": uploadLength } : {}),
        ...(uploadMetadata ? { "Upload-Metadata": uploadMetadata } : {}),
      },
    },
  );

  const location = cfRes.headers.get("Location");
  const mediaId = cfRes.headers.get("stream-media-id");

  // Record the real Stream uid on our clips row (best-effort; the webhook also
  // correlates via meta.clipid).
  const clipId = parseClipId(uploadMetadata);
  if (mediaId && clipId) {
    try {
      await db
        .update(clips)
        .set({ assetId: mediaId })
        .where(eq(clips.id, clipId));
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
