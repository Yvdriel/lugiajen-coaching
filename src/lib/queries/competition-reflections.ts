import { and, asc, desc, eq, gt, isNull, lte, or } from "drizzle-orm";
import {
  competitionAthleteReflection,
  competitionEntries,
  competitions,
} from "@/db/schema";
import type { CompetitionType } from "@/features/competitions/schema";
import { db } from "@/lib/db";
import type { CompetitionEntry } from "@/lib/queries/competitions";
import { getPreviousMeeting } from "@/lib/queries/feedback";

export type ReflectionRow = typeof competitionAthleteReflection.$inferSelect;

/** One competition in a meeting's window: all of the athlete's entries (one per
 *  category) plus the single athlete reflection (null until they fill it). */
export type MeetingCompetition = {
  competitionId: string;
  competitionName: string;
  competitionDate: string;
  competitionType: CompetitionType;
  /** Distinct categories the athlete entered, in display order. */
  categories: string[];
  entries: CompetitionEntry[];
  reflection: ReflectionRow | null;
};

type MeetingRef = {
  id: string;
  athleteId: string;
  meetingDate: string;
  createdAt: Date;
};

/**
 * Competitions the athlete competed in SINCE their previous meeting (the review-loop
 * rule: most recent COMPLETED meeting before `meeting`, by meetingDate then createdAt).
 *
 * - Upper bound: competition date on or before the meeting's date.
 * - Lower bound: strictly after the previous meeting's date (no bound on the first
 *   meeting, so it sweeps the athlete's whole history once).
 * - Dedup: a competition already reflected at a DIFFERENT meeting drops out, so it
 *   never reappears next time — but one reflected during THIS meeting's prep stays,
 *   so the coach still sees it side by side.
 *
 * Returns one item per competition, newest first; entries grouped by competition.
 */
export async function getMeetingCompetitionWindow(
  meeting: MeetingRef,
): Promise<MeetingCompetition[]> {
  const prev = await getPreviousMeeting(meeting.athleteId, meeting);

  const dateBounds = [lte(competitions.date, meeting.meetingDate)];
  if (prev) dateBounds.push(gt(competitions.date, prev.meetingDate));

  // Keep rows whose reflection is unset, untied, or tied to THIS meeting.
  const reflectionGuard = or(
    isNull(competitionAthleteReflection.id),
    isNull(competitionAthleteReflection.reflectedAtMeetingId),
    eq(competitionAthleteReflection.reflectedAtMeetingId, meeting.id),
  );

  const rows = await db
    .select({
      entry: competitionEntries,
      competitionName: competitions.name,
      competitionDate: competitions.date,
      competitionType: competitions.competitionType,
      reflection: competitionAthleteReflection,
    })
    .from(competitionEntries)
    .innerJoin(
      competitions,
      eq(competitionEntries.competitionId, competitions.id),
    )
    .leftJoin(
      competitionAthleteReflection,
      and(
        eq(competitionAthleteReflection.competitionId, competitions.id),
        eq(competitionAthleteReflection.athleteId, meeting.athleteId),
      ),
    )
    .where(
      and(
        eq(competitionEntries.athleteId, meeting.athleteId),
        ...dateBounds,
        reflectionGuard,
      ),
    )
    .orderBy(desc(competitions.date), asc(competitionEntries.category));

  // Group entries by competition, preserving newest-first + per-category order.
  const byComp = new Map<string, MeetingCompetition>();
  for (const r of rows) {
    let item = byComp.get(r.entry.competitionId);
    if (!item) {
      item = {
        competitionId: r.entry.competitionId,
        competitionName: r.competitionName,
        competitionDate: r.competitionDate,
        competitionType: r.competitionType,
        categories: [],
        entries: [],
        reflection: r.reflection,
      };
      byComp.set(r.entry.competitionId, item);
    }
    item.entries.push(r.entry);
    if (!item.categories.includes(r.entry.category)) {
      item.categories.push(r.entry.category);
    }
  }
  return [...byComp.values()];
}
