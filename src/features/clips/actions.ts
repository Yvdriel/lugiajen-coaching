"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { clips } from "@/db/schema";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { deleteAsset, getVideoDetails } from "./lib/stream";
import { type ClipUploadInput, clipUploadSchema } from "./schema";

// Every mutating action re-checks the session itself (convention 2).
async function requireSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
}

export type ClipActionState = {
  ok: boolean;
  clipId?: string;
  message?: string;
};

// Until the tus proxy records the real Stream uid, assetId holds this prefix.
const PENDING_PREFIX = "pending:";

/**
 * Create the clips row for a new upload (status `uploading`). The video bytes do
 * NOT pass through here — the client uploads them straight to Cloudflare via tus
 * (the `/api/clips/tus` proxy records the real Stream uid). Returns the clipId the
 * client passes as tus metadata.
 */
export async function createClipUpload(
  input: ClipUploadInput,
): Promise<ClipActionState> {
  await requireSession();
  const parsed = clipUploadSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message };
  }
  const { athleteId, kataId, recordedAt, label } = parsed.data;
  const [created] = await db
    .insert(clips)
    .values({
      athleteId,
      kataId: kataId ?? null,
      kind: "raw",
      assetId: `${PENDING_PREFIX}${crypto.randomUUID()}`,
      status: "uploading",
      visibility: "coach_only",
      recordedAt: recordedAt ? new Date(recordedAt) : null,
      label: label ?? null,
    })
    .returning({ id: clips.id });
  revalidatePath(`/athletes/${athleteId}`);
  return { ok: true, clipId: created.id };
}

/** After the tus upload finishes: uploading → processing (Cloudflare transcodes). */
export async function markClipUploaded(
  clipId: string,
): Promise<ClipActionState> {
  await requireSession();
  const [row] = await db
    .update(clips)
    .set({ status: "processing" })
    .where(and(eq(clips.id, clipId), eq(clips.status, "uploading")))
    .returning({ athleteId: clips.athleteId });
  if (row) revalidatePath(`/athletes/${row.athleteId}`);
  return { ok: true };
}

/**
 * Local-dev / on-demand status sync: ask Cloudflare for the video's state and flip
 * the clip to ready/error. The production path is the webhook; this lets a coach
 * refresh without a reachable webhook. Returns void so it can be used directly as a
 * `<form action>` (bound with the clipId).
 */
export async function syncClipStatus(clipId: string): Promise<void> {
  await requireSession();
  const [clip] = await db
    .select({ assetId: clips.assetId, athleteId: clips.athleteId })
    .from(clips)
    .where(eq(clips.id, clipId));
  if (!clip) return;
  if (clip.assetId.startsWith(PENDING_PREFIX)) return;

  const details = await getVideoDetails(clip.assetId);
  const next =
    details.state === "ready" && details.readyToStream
      ? {
          status: "ready" as const,
          durationMs:
            details.durationSeconds != null
              ? Math.round(details.durationSeconds * 1000)
              : null,
          thumbnailUrl: details.thumbnail,
        }
      : details.state === "error"
        ? { status: "error" as const }
        : { status: "processing" as const };

  await db.update(clips).set(next).where(eq(clips.id, clipId));
  revalidatePath(`/athletes/${clip.athleteId}`);
  revalidatePath(`/athletes/${clip.athleteId}/clips/${clipId}`);
}

/** Delete a clip: remove the Stream asset (best-effort) then the row. */
export async function deleteClip(clipId: string): Promise<ClipActionState> {
  await requireSession();
  const [clip] = await db
    .select({ assetId: clips.assetId, athleteId: clips.athleteId })
    .from(clips)
    .where(eq(clips.id, clipId));
  if (!clip) return { ok: false, message: "Onbekende clip." };

  if (!clip.assetId.startsWith(PENDING_PREFIX)) {
    try {
      await deleteAsset(clip.assetId);
    } catch {
      // Asset may already be gone on Cloudflare — proceed with the row delete.
    }
  }
  await db.delete(clips).where(eq(clips.id, clipId));
  revalidatePath(`/athletes/${clip.athleteId}`);
  redirect(`/athletes/${clip.athleteId}?tab=clips`);
}
