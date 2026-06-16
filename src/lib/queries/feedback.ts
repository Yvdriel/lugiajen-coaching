import { asc, desc, eq } from "drizzle-orm";
import { feedbackForms, feedbackKataRatings, kata } from "@/db/schema";
import { db } from "@/lib/db";

// Shared feedback reads (convention 4).
export type FeedbackRow = typeof feedbackForms.$inferSelect;

export type FeedbackKataRatingRow = {
  kataId: string;
  kataName: string;
  score: number | null;
  notes: string | null;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** An athlete's feedback forms, newest meeting first. */
export function getFeedbackForms(athleteId: string): Promise<FeedbackRow[]> {
  return db
    .select()
    .from(feedbackForms)
    .where(eq(feedbackForms.athleteId, athleteId))
    .orderBy(desc(feedbackForms.meetingDate), desc(feedbackForms.createdAt));
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
