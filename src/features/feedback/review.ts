import type { FeedbackReview } from "@/components/forms/feedback-fields";
import {
  type FeedbackActionRow,
  type FeedbackGoalRow,
  getOpenGoalsForReview,
  getPendingActionsForReview,
  getPreviousMeeting,
} from "@/lib/queries/feedback";

// Map the previous meeting's open rows to the (client) review-panel shape. Shared by
// the coach form pages and the athlete prepare page.
export function toReview(
  goals: FeedbackGoalRow[],
  actions: FeedbackActionRow[],
): FeedbackReview {
  return {
    goals: goals.map((g) => ({
      id: g.id,
      category: g.category,
      text: g.text,
      athleteDisposition: g.athleteDisposition,
      athleteReason: g.athleteReason,
    })),
    actions: actions.map((a) => ({
      id: a.id,
      text: a.text,
      kataName: a.kataName,
      athleteDisposition: a.athleteDisposition,
      athleteReason: a.athleteReason,
    })),
  };
}

/**
 * Load the previous meeting's open goals + pending actions for an athlete, mapped to
 * the review-panel shape. `current` is the meeting being worked (null on create).
 */
export async function loadReview(
  athleteId: string,
  current: { id: string; meetingDate: string; createdAt: Date } | null,
): Promise<FeedbackReview> {
  const prev = await getPreviousMeeting(athleteId, current);
  if (!prev) return { goals: [], actions: [] };
  const [goals, actions] = await Promise.all([
    getOpenGoalsForReview(prev.id),
    getPendingActionsForReview(prev.id),
  ]);
  return toReview(goals, actions);
}
