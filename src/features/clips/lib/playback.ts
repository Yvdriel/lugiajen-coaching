import { getSignedPlaybackToken, iframeUrl } from "./stream";

/**
 * Signed Stream player URL for a clip, minted server-side, or null when the clip
 * isn't `ready` (or the signing key isn't configured — degrade to a placeholder
 * instead of 500-ing a whole page). Never returns a permanent/public URL.
 */
export async function signedIframeUrl(
  assetId: string,
  status: string,
): Promise<string | null> {
  if (status !== "ready") return null;
  try {
    const token = await getSignedPlaybackToken(assetId, { expSeconds: 3600 });
    return iframeUrl(token);
  } catch {
    return null;
  }
}
