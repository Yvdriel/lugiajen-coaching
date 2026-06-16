import type {
  FeedbackKataRatingRow,
  FeedbackRow,
} from "@/lib/queries/feedback";
import {
  FEEDBACK_CONTENT_FIELDS,
  kataNotesField,
  kataScoreField,
} from "./schema";

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

/**
 * Default values for the kata self-rating rows (one score + notes per kata in the
 * athlete's repertoire), pre-filled from saved ratings when editing.
 */
export function kataRatingValues(
  repertoire: { kataId: string }[],
  saved: FeedbackKataRatingRow[] = [],
): FeedbackValues {
  const byKata = new Map(saved.map((r) => [r.kataId, r]));
  const out: FeedbackValues = {};
  for (const k of repertoire) {
    const r = byKata.get(k.kataId);
    out[kataScoreField(k.kataId)] = r?.score == null ? "" : String(r.score);
    out[kataNotesField(k.kataId)] = r?.notes ?? "";
  }
  return out;
}
