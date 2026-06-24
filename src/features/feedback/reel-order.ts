// Pure reel-ordering helpers (no db, no React) so the coach's up/down buttons and
// the reorder action share one tested definition of "what the new order is".

export type Direction = "up" | "down";

/**
 * Move `id` one step up or down within an ordered list. No-op (returns a copy) when
 * the id is missing or already at the relevant end. Never mutates the input.
 */
export function moveInOrder<T>(ids: readonly T[], id: T, dir: Direction): T[] {
  const i = ids.indexOf(id);
  const next = [...ids];
  if (i === -1) return next;
  const j = dir === "up" ? i - 1 : i + 1;
  if (j < 0 || j >= next.length) return next;
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

/** Map an ordered id list to `{ id, sortOrder }` pairs (index = sortOrder). */
export function reorderSortValues(
  ids: readonly string[],
): { id: string; sortOrder: number }[] {
  return ids.map((id, i) => ({ id, sortOrder: i }));
}

/**
 * The reel clips that get a signed playback token — only `ready` clips are playable.
 * Used to decide which clips to mint tokens for (portal shows ready clips only).
 */
export function playableReelClips<T extends { status: string }>(
  clips: readonly T[],
): T[] {
  return clips.filter((c) => c.status === "ready");
}

/**
 * The coach may curate the reel (attach / detach / reorder / caption) only BEFORE
 * the meeting — i.e. while the gesprek is still a draft or athlete-prepared and the
 * coach hasn't opened the in-person edit. During the meeting (`editing`) and after
 * it (`completed`) the reel is play-only.
 */
export function isReelEditable(status: string, editing: boolean): boolean {
  return status !== "completed" && !editing;
}
