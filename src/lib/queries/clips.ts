import { desc, eq } from "drizzle-orm";
import { clips, kata } from "@/db/schema";
import { db } from "@/lib/db";

// Video clip reads (convention 4). Coach-only surface; portal exposure is Session 4.

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ClipRow = typeof clips.$inferSelect;

export type AthleteClipRow = ClipRow & { kataName: string | null };

/** All of an athlete's clips, newest first, with the kata name when set. */
export function getAthleteClips(athleteId: string): Promise<AthleteClipRow[]> {
  // Treat a malformed id as a miss (avoids a Postgres uuid-cast 500).
  if (!UUID_RE.test(athleteId)) return Promise.resolve([]);
  return db
    .select({
      id: clips.id,
      athleteId: clips.athleteId,
      kataId: clips.kataId,
      kind: clips.kind,
      derivedFromClipId: clips.derivedFromClipId,
      provider: clips.provider,
      assetId: clips.assetId,
      status: clips.status,
      durationMs: clips.durationMs,
      thumbnailUrl: clips.thumbnailUrl,
      visibility: clips.visibility,
      recordedAt: clips.recordedAt,
      label: clips.label,
      createdAt: clips.createdAt,
      updatedAt: clips.updatedAt,
      kataName: kata.name,
    })
    .from(clips)
    .leftJoin(kata, eq(clips.kataId, kata.id))
    .where(eq(clips.athleteId, athleteId))
    .orderBy(desc(clips.createdAt));
}

/** A single clip by id (with kata name), or null on a malformed id / miss. */
export async function getClipById(
  clipId: string,
): Promise<AthleteClipRow | null> {
  if (!UUID_RE.test(clipId)) return null;
  const [row] = await db
    .select({
      id: clips.id,
      athleteId: clips.athleteId,
      kataId: clips.kataId,
      kind: clips.kind,
      derivedFromClipId: clips.derivedFromClipId,
      provider: clips.provider,
      assetId: clips.assetId,
      status: clips.status,
      durationMs: clips.durationMs,
      thumbnailUrl: clips.thumbnailUrl,
      visibility: clips.visibility,
      recordedAt: clips.recordedAt,
      label: clips.label,
      createdAt: clips.createdAt,
      updatedAt: clips.updatedAt,
      kataName: kata.name,
    })
    .from(clips)
    .leftJoin(kata, eq(clips.kataId, kata.id))
    .where(eq(clips.id, clipId));
  return row ?? null;
}
