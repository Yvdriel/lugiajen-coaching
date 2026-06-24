import {
  and,
  asc,
  desc,
  eq,
  getTableColumns,
  inArray,
  isNull,
  lt,
  ne,
  or,
} from "drizzle-orm";
import {
  clips,
  feedbackActionItems,
  feedbackClips,
  feedbackForms,
  feedbackGoals,
  feedbackKataRatings,
  kata,
} from "@/db/schema";
import { db } from "@/lib/db";

// Shared feedback reads (convention 4).
export type FeedbackRow = typeof feedbackForms.$inferSelect;
export type FeedbackGoalRow = typeof feedbackGoals.$inferSelect;
export type FeedbackActionRow = typeof feedbackActionItems.$inferSelect & {
  kataName: string | null;
};

export type FeedbackKataRatingRow = {
  kataId: string;
  kataName: string;
  score: number | null;
  notes: string | null;
};

type ClipRow = typeof clips.$inferSelect;

/** One clip as curated onto a feedback gesprek's reel (join row). */
export type ReelClipRow = {
  feedbackClipId: string;
  feedbackId: string;
  clipId: string;
  caption: string | null;
  addedBy: (typeof feedbackClips.$inferSelect)["addedBy"];
  sortOrder: number;
  assetId: string;
  status: ClipRow["status"];
  kind: ClipRow["kind"];
  label: string | null;
  thumbnailUrl: string | null;
  durationMs: number | null;
  kataName: string | null;
};

// One canonical projection for the reel join, shared by both reel reads.
const reelClipColumns = {
  feedbackClipId: feedbackClips.id,
  feedbackId: feedbackClips.feedbackId,
  clipId: feedbackClips.clipId,
  caption: feedbackClips.caption,
  addedBy: feedbackClips.addedBy,
  sortOrder: feedbackClips.sortOrder,
  assetId: clips.assetId,
  status: clips.status,
  kind: clips.kind,
  label: clips.label,
  thumbnailUrl: clips.thumbnailUrl,
  durationMs: clips.durationMs,
  kataName: kata.name,
} as const;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** An athlete's feedback forms, newest meeting first (all statuses — coach view). */
export function getFeedbackForms(athleteId: string): Promise<FeedbackRow[]> {
  return db
    .select()
    .from(feedbackForms)
    .where(eq(feedbackForms.athleteId, athleteId))
    .orderBy(desc(feedbackForms.meetingDate), desc(feedbackForms.createdAt));
}

/**
 * Completed gesprekken only — the parent-facing portal history, stats "latest", and
 * "days since last feedback" must never count a draft as a finished meeting.
 */
export function getCompletedFeedbackForms(
  athleteId: string,
): Promise<FeedbackRow[]> {
  return db
    .select()
    .from(feedbackForms)
    .where(
      and(
        eq(feedbackForms.athleteId, athleteId),
        eq(feedbackForms.status, "completed"),
      ),
    )
    .orderBy(desc(feedbackForms.meetingDate), desc(feedbackForms.createdAt));
}

/** Resolve a feedback form by its public prepare-link token (UUID-guarded). */
export async function getFeedbackByPrepareToken(
  token: string,
): Promise<FeedbackRow | null> {
  if (!UUID_RE.test(token)) return null;
  const [row] = await db
    .select()
    .from(feedbackForms)
    .where(eq(feedbackForms.prepareToken, token));
  return row ?? null;
}

/**
 * The athlete's open prepared form (awaiting_athlete or athlete_submitted), newest
 * first — drives the portal's "vul je deel in" / "ingevuld" card. At most one is
 * expected in practice.
 */
export async function getPendingPrepareForm(
  athleteId: string,
): Promise<FeedbackRow | null> {
  const [row] = await db
    .select()
    .from(feedbackForms)
    .where(
      and(
        eq(feedbackForms.athleteId, athleteId),
        ne(feedbackForms.status, "completed"),
      ),
    )
    .orderBy(desc(feedbackForms.createdAt));
  return row ?? null;
}

export async function getFeedbackById(id: string): Promise<FeedbackRow | null> {
  if (!UUID_RE.test(id)) return null; // malformed path → not found, not 500
  const [row] = await db
    .select()
    .from(feedbackForms)
    .where(eq(feedbackForms.id, id));
  return row ?? null;
}

/** Kata self-ratings recorded on a feedback gesprek, in seed order. */
export function getFeedbackKataRatings(
  feedbackId: string,
): Promise<FeedbackKataRatingRow[]> {
  if (!UUID_RE.test(feedbackId)) return Promise.resolve([]);
  return db
    .select({
      kataId: feedbackKataRatings.kataId,
      kataName: kata.name,
      score: feedbackKataRatings.score,
      notes: feedbackKataRatings.notes,
    })
    .from(feedbackKataRatings)
    .innerJoin(kata, eq(feedbackKataRatings.kataId, kata.id))
    .where(eq(feedbackKataRatings.feedbackId, feedbackId))
    .orderBy(asc(kata.sortOrder));
}

/** All of an athlete's feedback kata-ratings, grouped by feedback id (one query). */
export async function getFeedbackKataRatingsByAthlete(
  athleteId: string,
): Promise<Map<string, FeedbackKataRatingRow[]>> {
  const rows = await db
    .select({
      feedbackId: feedbackKataRatings.feedbackId,
      kataId: feedbackKataRatings.kataId,
      kataName: kata.name,
      score: feedbackKataRatings.score,
      notes: feedbackKataRatings.notes,
    })
    .from(feedbackKataRatings)
    .innerJoin(kata, eq(feedbackKataRatings.kataId, kata.id))
    .innerJoin(
      feedbackForms,
      eq(feedbackKataRatings.feedbackId, feedbackForms.id),
    )
    .where(eq(feedbackForms.athleteId, athleteId))
    .orderBy(asc(kata.sortOrder));

  const map = new Map<string, FeedbackKataRatingRow[]>();
  for (const r of rows) {
    const list = map.get(r.feedbackId) ?? [];
    list.push({
      kataId: r.kataId,
      kataName: r.kataName,
      score: r.score,
      notes: r.notes,
    });
    map.set(r.feedbackId, list);
  }
  return map;
}

/** The ordered clip reel for one feedback gesprek (join clips + kata name). */
export function getFeedbackClips(feedbackId: string): Promise<ReelClipRow[]> {
  if (!UUID_RE.test(feedbackId)) return Promise.resolve([]);
  return db
    .select(reelClipColumns)
    .from(feedbackClips)
    .innerJoin(clips, eq(feedbackClips.clipId, clips.id))
    .leftJoin(kata, eq(clips.kataId, kata.id))
    .where(eq(feedbackClips.feedbackId, feedbackId))
    .orderBy(asc(feedbackClips.sortOrder));
}

/**
 * Reels for many feedback forms at once, grouped by feedback id (one query) — the
 * portal renders several completed gesprekken together. Empty input → empty map.
 */
export async function getFeedbackClipsByFeedbackIds(
  feedbackIds: string[],
): Promise<Map<string, ReelClipRow[]>> {
  const valid = feedbackIds.filter((id) => UUID_RE.test(id));
  if (valid.length === 0) return new Map();
  const rows = await db
    .select(reelClipColumns)
    .from(feedbackClips)
    .innerJoin(clips, eq(feedbackClips.clipId, clips.id))
    .leftJoin(kata, eq(clips.kataId, kata.id))
    .where(inArray(feedbackClips.feedbackId, valid))
    .orderBy(asc(feedbackClips.sortOrder));

  const map = new Map<string, ReelClipRow[]>();
  for (const r of rows) {
    const list = map.get(r.feedbackId) ?? [];
    list.push(r);
    map.set(r.feedbackId, list);
  }
  return map;
}

// ── Goals + action items (promoted from columns; review-loop aware) ────────────

const actionColumns = {
  ...getTableColumns(feedbackActionItems),
  kataName: kata.name,
} as const;

/** Goals created in one gesprek, in slot order (all statuses). */
export function getFeedbackGoals(feedbackId: string): Promise<FeedbackGoalRow[]> {
  if (!UUID_RE.test(feedbackId)) return Promise.resolve([]);
  return db
    .select()
    .from(feedbackGoals)
    .where(eq(feedbackGoals.feedbackId, feedbackId))
    .orderBy(asc(feedbackGoals.sortOrder));
}

/** Action items created in one gesprek (+ kata name), in display order. */
export function getFeedbackActionItems(
  feedbackId: string,
): Promise<FeedbackActionRow[]> {
  if (!UUID_RE.test(feedbackId)) return Promise.resolve([]);
  return db
    .select(actionColumns)
    .from(feedbackActionItems)
    .leftJoin(kata, eq(feedbackActionItems.kataId, kata.id))
    .where(eq(feedbackActionItems.feedbackId, feedbackId))
    .orderBy(asc(feedbackActionItems.sortOrder));
}

/** Goals for many gesprekken at once, grouped by feedback id (portal batch). */
export async function getFeedbackGoalsByFeedbackIds(
  feedbackIds: string[],
): Promise<Map<string, FeedbackGoalRow[]>> {
  const valid = feedbackIds.filter((id) => UUID_RE.test(id));
  if (valid.length === 0) return new Map();
  const rows = await db
    .select()
    .from(feedbackGoals)
    .where(inArray(feedbackGoals.feedbackId, valid))
    .orderBy(asc(feedbackGoals.sortOrder));
  const map = new Map<string, FeedbackGoalRow[]>();
  for (const r of rows) {
    const list = map.get(r.feedbackId) ?? [];
    list.push(r);
    map.set(r.feedbackId, list);
  }
  return map;
}

/** Action items for many gesprekken at once, grouped by feedback id (portal batch). */
export async function getFeedbackActionItemsByFeedbackIds(
  feedbackIds: string[],
): Promise<Map<string, FeedbackActionRow[]>> {
  const valid = feedbackIds.filter((id) => UUID_RE.test(id));
  if (valid.length === 0) return new Map();
  const rows = await db
    .select(actionColumns)
    .from(feedbackActionItems)
    .leftJoin(kata, eq(feedbackActionItems.kataId, kata.id))
    .where(inArray(feedbackActionItems.feedbackId, valid))
    .orderBy(asc(feedbackActionItems.sortOrder));
  const map = new Map<string, FeedbackActionRow[]>();
  for (const r of rows) {
    const list = map.get(r.feedbackId) ?? [];
    list.push(r);
    map.set(r.feedbackId, list);
  }
  return map;
}

// ── Review loop ────────────────────────────────────────────────────────────────

/**
 * The athlete's most recent COMPLETED gesprek strictly before `current` — the one
 * whose open goals + pending actions the review panel surfaces. Pass `current = null`
 * on the create path (no current meeting yet) to get the latest completed one.
 */
export async function getPreviousMeeting(
  athleteId: string,
  current: { id: string; meetingDate: string; createdAt: Date } | null,
): Promise<FeedbackRow | null> {
  const conds = [
    eq(feedbackForms.athleteId, athleteId),
    eq(feedbackForms.status, "completed"),
  ];
  if (current) {
    conds.push(ne(feedbackForms.id, current.id));
    const before = or(
      lt(feedbackForms.meetingDate, current.meetingDate),
      and(
        eq(feedbackForms.meetingDate, current.meetingDate),
        lt(feedbackForms.createdAt, current.createdAt),
      ),
    );
    if (before) conds.push(before);
  }
  const [row] = await db
    .select()
    .from(feedbackForms)
    .where(and(...conds))
    .orderBy(desc(feedbackForms.meetingDate), desc(feedbackForms.createdAt))
    .limit(1);
  return row ?? null;
}

/**
 * Open goals of the previous meeting (status=active, not yet reviewed). The
 * `reviewedAtMeetingId IS NULL` filter is what keeps clean-slate backfilled goals
 * (self-stamped at migration) out of the review panel.
 */
export function getOpenGoalsForReview(
  prevMeetingId: string,
): Promise<FeedbackGoalRow[]> {
  if (!UUID_RE.test(prevMeetingId)) return Promise.resolve([]);
  return db
    .select()
    .from(feedbackGoals)
    .where(
      and(
        eq(feedbackGoals.feedbackId, prevMeetingId),
        eq(feedbackGoals.status, "active"),
        isNull(feedbackGoals.reviewedAtMeetingId),
      ),
    )
    .orderBy(asc(feedbackGoals.sortOrder));
}

/** Pending actions of the previous meeting (coachDisposition=pending), + kata name. */
export function getPendingActionsForReview(
  prevMeetingId: string,
): Promise<FeedbackActionRow[]> {
  if (!UUID_RE.test(prevMeetingId)) return Promise.resolve([]);
  return db
    .select(actionColumns)
    .from(feedbackActionItems)
    .leftJoin(kata, eq(feedbackActionItems.kataId, kata.id))
    .where(
      and(
        eq(feedbackActionItems.feedbackId, prevMeetingId),
        eq(feedbackActionItems.coachDisposition, "pending"),
      ),
    )
    .orderBy(asc(feedbackActionItems.sortOrder));
}
