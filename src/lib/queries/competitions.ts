import { and, asc, desc, eq, notInArray, sql } from "drizzle-orm";
import {
  athleteKata,
  athletes,
  competitionEntries,
  competitions,
  kata,
} from "@/db/schema";
import { db } from "@/lib/db";
import type { CompetitionType } from "@/features/competitions/schema";

// Shared competition reads (convention 4): list + detail + per-athlete history, plus
// the active-athletes-with-repertoire payload that feeds the entry wizard.

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const countExpr = sql<number>`count(*)::int`;

export type CompetitionRow = typeof competitions.$inferSelect;
export type CompetitionEntry = typeof competitionEntries.$inferSelect;

export type CompetitionListItem = CompetitionRow & { entryCount: number };

/** All competitions, newest first, with their entry counts. */
export async function getCompetitionsList(): Promise<CompetitionListItem[]> {
  const [rows, counts] = await Promise.all([
    db.select().from(competitions).orderBy(desc(competitions.date)),
    db
      .select({
        competitionId: competitionEntries.competitionId,
        n: countExpr,
      })
      .from(competitionEntries)
      .groupBy(competitionEntries.competitionId),
  ]);
  const countMap = new Map(counts.map((c) => [c.competitionId, c.n]));
  return rows.map((c) => ({ ...c, entryCount: countMap.get(c.id) ?? 0 }));
}

export async function getCompetitionById(
  id: string,
): Promise<CompetitionRow | null> {
  if (!UUID_RE.test(id)) return null; // malformed path → not found, not 500
  const [row] = await db
    .select()
    .from(competitions)
    .where(eq(competitions.id, id));
  return row ?? null;
}

export type CompetitionEntryRow = {
  entry: CompetitionEntry;
  athleteFirstName: string;
  athleteLastName: string;
};

/** Entries for one competition, with the athlete's name. */
export function getCompetitionEntries(
  competitionId: string,
): Promise<CompetitionEntryRow[]> {
  return db
    .select({
      entry: competitionEntries,
      athleteFirstName: athletes.firstName,
      athleteLastName: athletes.lastName,
    })
    .from(competitionEntries)
    .innerJoin(athletes, eq(competitionEntries.athleteId, athletes.id))
    .where(eq(competitionEntries.competitionId, competitionId))
    .orderBy(asc(athletes.lastName), asc(athletes.firstName));
}

export async function getCompetitionEntryById(
  id: string,
): Promise<CompetitionEntry | null> {
  if (!UUID_RE.test(id)) return null;
  const [row] = await db
    .select()
    .from(competitionEntries)
    .where(eq(competitionEntries.id, id));
  return row ?? null;
}

export type AthleteCompetitionRow = {
  entry: CompetitionEntry;
  competitionName: string;
  competitionDate: string;
  competitionType: CompetitionType;
};

/** One athlete's competition entries, newest competition first (Wedstrijden tab). */
export function getAthleteCompetitions(
  athleteId: string,
): Promise<AthleteCompetitionRow[]> {
  return db
    .select({
      entry: competitionEntries,
      competitionName: competitions.name,
      competitionDate: competitions.date,
      competitionType: competitions.competitionType,
    })
    .from(competitionEntries)
    .innerJoin(competitions, eq(competitionEntries.competitionId, competitions.id))
    .where(eq(competitionEntries.athleteId, athleteId))
    .orderBy(desc(competitions.date));
}

export type AthleteWithRepertoire = {
  id: string;
  firstName: string;
  lastName: string;
  repertoire: { kataId: string; kataName: string; roundOrder: number | null }[];
};

/**
 * Active athletes each with their competition repertoire (falls back to the full
 * repertoire when none is flagged as a competition kata, so the per-round selects
 * are never empty). One payload feeds the wizard's Atleten + Kata-per-ronde steps.
 */
export async function getActiveAthletesWithRepertoire(): Promise<
  AthleteWithRepertoire[]
> {
  const [ath, rep] = await Promise.all([
    db
      .select({
        id: athletes.id,
        firstName: athletes.firstName,
        lastName: athletes.lastName,
      })
      .from(athletes)
      .where(eq(athletes.isActive, true))
      .orderBy(asc(athletes.lastName), asc(athletes.firstName)),
    db
      .select({
        athleteId: athleteKata.athleteId,
        kataId: kata.id,
        kataName: kata.name,
        roundOrder: athleteKata.roundOrder,
        isCompetitionKata: athleteKata.isCompetitionKata,
      })
      .from(athleteKata)
      .innerJoin(kata, eq(athleteKata.kataId, kata.id))
      .orderBy(asc(athleteKata.roundOrder), asc(kata.sortOrder)),
  ]);

  return ath.map((a) => {
    const own = rep.filter((r) => r.athleteId === a.id);
    const comp = own.filter((r) => r.isCompetitionKata);
    const source = comp.length > 0 ? comp : own;
    return {
      id: a.id,
      firstName: a.firstName,
      lastName: a.lastName,
      repertoire: source.map((r) => ({
        kataId: r.kataId,
        kataName: r.kataName,
        roundOrder: r.roundOrder,
      })),
    };
  });
}

/** Active athletes not yet entered in this competition (the detail add picker). */
export function getAthletesNotInCompetition(
  competitionId: string,
): Promise<{ id: string; firstName: string; lastName: string }[]> {
  const entered = db
    .select({ athleteId: competitionEntries.athleteId })
    .from(competitionEntries)
    .where(eq(competitionEntries.competitionId, competitionId));
  return db
    .select({
      id: athletes.id,
      firstName: athletes.firstName,
      lastName: athletes.lastName,
    })
    .from(athletes)
    .where(and(eq(athletes.isActive, true), notInArray(athletes.id, entered)))
    .orderBy(asc(athletes.lastName), asc(athletes.firstName));
}
