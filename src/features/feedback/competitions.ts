import {
  getMeetingCompetitionWindow,
  type MeetingCompetition,
} from "@/lib/queries/competition-reflections";
import type { CompetitionPrepItem } from "./schema";

export type { CompetitionPrepItem, MeetingCompetition };

type MeetingRef = {
  id: string;
  athleteId: string;
  meetingDate: string;
  createdAt: Date;
};

/**
 * The competitions in a meeting's window, with full entries + reflection. Server-only
 * shape — fed to the coach side-by-side panel and the coach PDF. Mirrors `loadReview`.
 */
export function loadMeetingCompetitions(
  meeting: MeetingRef,
): Promise<MeetingCompetition[]> {
  return getMeetingCompetitionWindow(meeting);
}

/**
 * Map the window to the athlete's prep shape — meta + their own reflection values,
 * NOTHING from the coach's per-entry feedback. This mapper is the security boundary:
 * coach feedback must never reach the public prepare client component.
 */
export function toPrepItems(
  window: MeetingCompetition[],
): CompetitionPrepItem[] {
  return window.map((c) => ({
    competitionId: c.competitionId,
    competitionName: c.competitionName,
    competitionDate: c.competitionDate,
    competitionType: c.competitionType,
    categories: c.categories,
    reflection: {
      overallRating: c.reflection?.overallRating ?? null,
      before: c.reflection?.reflectionBefore ?? null,
      performance: c.reflection?.reflectionPerformance ?? null,
      improvement: c.reflection?.reflectionImprovement ?? null,
      lesson: c.reflection?.reflectionLesson ?? null,
      notes: c.reflection?.reflectionNotes ?? null,
    },
  }));
}
