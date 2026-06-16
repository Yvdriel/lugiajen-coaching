import { asc, desc, eq, sql } from "drizzle-orm";
import {
  athleteKata,
  athletes,
  competitionEntries,
  competitions,
  kata,
} from "@/db/schema";
import { db } from "@/lib/db";
import type { CompetitionType } from "@/features/competitions/schema";
import { type Category, getCategories } from "@/lib/categories";

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
  athleteDateOfBirth: string;
};

/** Entries for one competition, with the athlete's name + DOB (for the edit-form category select). */
export function getCompetitionEntries(
  competitionId: string,
): Promise<CompetitionEntryRow[]> {
  return db
    .select({
      entry: competitionEntries,
      athleteFirstName: athletes.firstName,
      athleteLastName: athletes.lastName,
      athleteDateOfBirth: athletes.dateOfBirth,
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
  categories: Category[];
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
        dateOfBirth: athletes.dateOfBirth,
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
      categories: getCategories(new Date(a.dateOfBirth)),
      repertoire: source.map((r) => ({
        kataId: r.kataId,
        kataName: r.kataName,
        roundOrder: r.roundOrder,
      })),
    };
  });
}

export type AthleteForAdd = {
  id: string;
  firstName: string;
  lastName: string;
  categories: Category[];
  enteredCategories: string[];
};

/**
 * Active athletes for the detail "add athlete" picker, each with their eligible
 * age categories and the categories already entered in THIS competition — so the
 * UI can disable already-used (athlete, category) combos. Athletes are NOT filtered
 * out when partially entered: someone already in U21 must still be addable for Senior.
 */
export async function getAthletesNotInCompetition(
  competitionId: string,
): Promise<AthleteForAdd[]> {
  const [ath, entered] = await Promise.all([
    db
      .select({
        id: athletes.id,
        firstName: athletes.firstName,
        lastName: athletes.lastName,
        dateOfBirth: athletes.dateOfBirth,
      })
      .from(athletes)
      .where(eq(athletes.isActive, true))
      .orderBy(asc(athletes.lastName), asc(athletes.firstName)),
    db
      .select({
        athleteId: competitionEntries.athleteId,
        category: competitionEntries.category,
      })
      .from(competitionEntries)
      .where(eq(competitionEntries.competitionId, competitionId)),
  ]);

  const enteredByAthlete = new Map<string, string[]>();
  for (const e of entered) {
    const list = enteredByAthlete.get(e.athleteId) ?? [];
    list.push(e.category);
    enteredByAthlete.set(e.athleteId, list);
  }

  return ath.map((a) => ({
    id: a.id,
    firstName: a.firstName,
    lastName: a.lastName,
    categories: getCategories(new Date(a.dateOfBirth)),
    enteredCategories: enteredByAthlete.get(a.id) ?? [],
  }));
}
