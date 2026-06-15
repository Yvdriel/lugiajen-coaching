import { asc, eq, notInArray } from "drizzle-orm";
import { athleteKata, kata } from "@/db/schema";
import { db } from "@/lib/db";

// Shared kata reads (convention 4): the pre-seeded library + per-athlete repertoire.

export type KataLibraryItem = typeof kata.$inferSelect;

export type AthleteKataItem = {
  id: string; // athlete_kata row id
  kataId: string;
  kataName: string;
  category: "competition" | "development";
  flexibilityCategory: "A" | "B" | "C";
  roundOrder: number | null;
  isCompetitionKata: boolean;
  proficiency: number;
  notes: string | null;
};

/** Whole kata library, in seed order. */
export function getKataLibrary(): Promise<KataLibraryItem[]> {
  return db.select().from(kata).orderBy(asc(kata.sortOrder));
}

/** An athlete's repertoire, joined with kata metadata. Round order first (nulls last), then seed order. */
export function getAthleteKata(athleteId: string): Promise<AthleteKataItem[]> {
  return db
    .select({
      id: athleteKata.id,
      kataId: kata.id,
      kataName: kata.name,
      category: kata.category,
      flexibilityCategory: kata.flexibilityCategory,
      roundOrder: athleteKata.roundOrder,
      isCompetitionKata: athleteKata.isCompetitionKata,
      proficiency: athleteKata.proficiency,
      notes: athleteKata.notes,
    })
    .from(athleteKata)
    .innerJoin(kata, eq(athleteKata.kataId, kata.id))
    .where(eq(athleteKata.athleteId, athleteId))
    .orderBy(asc(athleteKata.roundOrder), asc(kata.sortOrder));
}

/** Library kata not yet in this athlete's repertoire (for the assign picker). */
export function getUnassignedKata(athleteId: string): Promise<KataLibraryItem[]> {
  const assigned = db
    .select({ id: athleteKata.kataId })
    .from(athleteKata)
    .where(eq(athleteKata.athleteId, athleteId));
  return db
    .select()
    .from(kata)
    .where(notInArray(kata.id, assigned))
    .orderBy(asc(kata.sortOrder));
}
