import type { FeedbackRow } from "@/lib/queries/feedback";
import { FEEDBACK_CONTENT_FIELDS } from "./schema";

// Form default values are all strings (RHF over native FormData).
export type FeedbackValues = Record<string, string>;

const s = (v: string | number | null): string => (v == null ? "" : String(v));

/** Stringify a saved row into form defaults (edit). */
export function feedbackToValues(row: FeedbackRow): FeedbackValues {
  const out: FeedbackValues = {
    meetingNumber: s(row.meetingNumber),
    meetingDate: row.meetingDate,
    season: row.season,
  };
  const content = row as unknown as Record<string, string | number | null>;
  for (const k of FEEDBACK_CONTENT_FIELDS) out[k] = s(content[k]);
  return out;
}

/** Blank defaults for a new form, seeded with today's date + current season. */
export function blankFeedbackValues(
  meetingDate: string,
  season: string,
): FeedbackValues {
  const out: FeedbackValues = { meetingNumber: "1", meetingDate, season };
  for (const k of FEEDBACK_CONTENT_FIELDS) out[k] = "";
  return out;
}
