import { desc, eq } from "drizzle-orm";
import { feedbackForms } from "@/db/schema";
import { db } from "@/lib/db";

// Shared feedback reads (convention 4).
export type FeedbackRow = typeof feedbackForms.$inferSelect;

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
