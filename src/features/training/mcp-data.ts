import { and, asc, desc, eq, gte, inArray, lte } from "drizzle-orm";
import {
  athleteKata,
  athleteNotes,
  athletes,
  competitionAthleteReflection,
  competitionEntries,
  competitions,
  kata,
  kataScoringCards,
  trainingPlans,
} from "@/db/schema";
import type { ScoringCardParsed } from "@/features/scoring/schema";
import { db } from "@/lib/db";

// Reads and writes the coaching-side MCP tools need beyond src/lib/queries/*
// (competitions, entries, scoring cards, repertoire, athlete notes). Validation is
// the caller's job (features/*/schema.ts). Same rules as queries/training.ts.

// ── Competitions ──────────────────────────────────────────────────────────────

export type CompetitionEntryDetail = typeof competitionEntries.$inferSelect & {
  athleteName: string;
  reflection: typeof competitionAthleteReflection.$inferSelect | null;
};
export type CompetitionDetail = typeof competitions.$inferSelect & {
  entries: CompetitionEntryDetail[];
};

/** Competitions in [from, to] with every entry (+ athlete name, reflection). */
export async function listCompetitionsDetailed(opts: {
  from?: string;
  to?: string;
  athleteId?: string;
}): Promise<CompetitionDetail[]> {
  const conds = [];
  if (opts.from) conds.push(gte(competitions.date, opts.from));
  if (opts.to) conds.push(lte(competitions.date, opts.to));
  const comps = await db
    .select()
    .from(competitions)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(competitions.date));
  if (comps.length === 0) return [];
  const ids = comps.map((c) => c.id);
  const entryConds = [inArray(competitionEntries.competitionId, ids)];
  if (opts.athleteId)
    entryConds.push(eq(competitionEntries.athleteId, opts.athleteId));
  const rows = await db
    .select({
      entry: competitionEntries,
      firstName: athletes.firstName,
      lastName: athletes.lastName,
      reflection: competitionAthleteReflection,
    })
    .from(competitionEntries)
    .innerJoin(athletes, eq(competitionEntries.athleteId, athletes.id))
    .leftJoin(
      competitionAthleteReflection,
      and(
        eq(
          competitionAthleteReflection.competitionId,
          competitionEntries.competitionId,
        ),
        eq(
          competitionAthleteReflection.athleteId,
          competitionEntries.athleteId,
        ),
      ),
    )
    .where(and(...entryConds))
    .orderBy(asc(athletes.lastName), asc(competitionEntries.category));
  const byComp = new Map<string, CompetitionEntryDetail[]>();
  for (const r of rows) {
    const list = byComp.get(r.entry.competitionId) ?? [];
    list.push({
      ...r.entry,
      athleteName: `${r.firstName} ${r.lastName}`,
      reflection: r.reflection,
    });
    byComp.set(r.entry.competitionId, list);
  }
  const out = comps.map((c) => ({ ...c, entries: byComp.get(c.id) ?? [] }));
  return opts.athleteId ? out.filter((c) => c.entries.length > 0) : out;
}

export async function getCompetitionDetail(
  competitionId: string,
): Promise<CompetitionDetail | null> {
  const [c] = await db
    .select()
    .from(competitions)
    .where(eq(competitions.id, competitionId));
  if (!c) return null;
  const sameDay = await listCompetitionsDetailed({ from: c.date, to: c.date });
  return sameDay.find((x) => x.id === c.id) ?? null;
}

export async function createCompetition(input: {
  name: string;
  date: string;
  competitionType: "club" | "regional" | "national" | "international";
  location?: string | null;
  notes?: string | null;
}): Promise<string> {
  const [row] = await db
    .insert(competitions)
    .values({
      name: input.name,
      date: input.date,
      competitionType: input.competitionType,
      location: input.location ?? null,
      notes: input.notes ?? null,
    })
    .returning({ id: competitions.id });
  return row.id;
}

export async function updateCompetition(
  competitionId: string,
  patch: {
    name?: string;
    date?: string;
    competitionType?: "club" | "regional" | "national" | "international";
    location?: string | null;
    notes?: string | null;
  },
): Promise<void> {
  await db
    .update(competitions)
    .set(patch)
    .where(eq(competitions.id, competitionId));
}

/** Null when the (competition, athlete, category) triple already exists. */
export async function addCompetitionEntry(input: {
  competitionId: string;
  athleteId: string;
  category: string;
}): Promise<string | null> {
  const [row] = await db
    .insert(competitionEntries)
    .values(input)
    .onConflictDoNothing()
    .returning({ id: competitionEntries.id });
  return row?.id ?? null;
}

type EntryPatch = Partial<
  Omit<
    typeof competitionEntries.$inferInsert,
    "id" | "competitionId" | "athleteId"
  >
>;

export async function updateCompetitionEntry(
  entryId: string,
  patch: EntryPatch,
): Promise<typeof competitionEntries.$inferSelect | null> {
  const [row] = await db
    .update(competitionEntries)
    .set(patch)
    .where(eq(competitionEntries.id, entryId))
    .returning();
  return row ?? null;
}

// ── Scoring cards ─────────────────────────────────────────────────────────────

export async function createScoringCard(
  athleteId: string,
  kataId: string,
  input: ScoringCardParsed,
): Promise<string> {
  const [row] = await db
    .insert(kataScoringCards)
    .values({ athleteId, kataId, ...input })
    .returning({ id: kataScoringCards.id });
  return row.id;
}

/** All of an athlete's cards with kata names, oldest first (timeline). */
export async function listAllScoringCards(athleteId: string) {
  return db
    .select({ card: kataScoringCards, kataName: kata.name })
    .from(kataScoringCards)
    .innerJoin(kata, eq(kataScoringCards.kataId, kata.id))
    .where(eq(kataScoringCards.athleteId, athleteId))
    .orderBy(
      asc(kataScoringCards.assessmentDate),
      asc(kataScoringCards.createdAt),
    );
}

// ── Repertoire ────────────────────────────────────────────────────────────────

/** Null when the athlete already has that kata. */
export async function assignKata(input: {
  athleteId: string;
  kataId: string;
  roundOrder?: number | null;
  isCompetitionKata?: boolean;
  notes?: string | null;
}): Promise<string | null> {
  const existing = await db
    .select({ id: athleteKata.id })
    .from(athleteKata)
    .where(
      and(
        eq(athleteKata.athleteId, input.athleteId),
        eq(athleteKata.kataId, input.kataId),
      ),
    );
  if (existing.length > 0) return null;
  const [row] = await db
    .insert(athleteKata)
    .values({
      athleteId: input.athleteId,
      kataId: input.kataId,
      roundOrder: input.roundOrder ?? null,
      isCompetitionKata: input.isCompetitionKata ?? false,
      notes: input.notes ?? null,
    })
    .returning({ id: athleteKata.id });
  return row.id;
}

export async function updateAthleteKata(
  athleteKataId: string,
  patch: {
    roundOrder?: number | null;
    isCompetitionKata?: boolean;
    notes?: string | null;
  },
): Promise<boolean> {
  const rows = await db
    .update(athleteKata)
    .set(patch)
    .where(eq(athleteKata.id, athleteKataId))
    .returning({ id: athleteKata.id });
  return rows.length > 0;
}

export async function removeAthleteKata(
  athleteKataId: string,
): Promise<boolean> {
  const rows = await db
    .delete(athleteKata)
    .where(eq(athleteKata.id, athleteKataId))
    .returning({ id: athleteKata.id });
  return rows.length > 0;
}

// ── Athlete ───────────────────────────────────────────────────────────────────

export async function updateAthleteNotes(
  athleteId: string,
  patch: { notes?: string | null; physicalNotes?: string | null },
): Promise<boolean> {
  const rows = await db
    .update(athletes)
    .set(patch)
    .where(eq(athletes.id, athleteId))
    .returning({ id: athletes.id });
  return rows.length > 0;
}

export async function addAthleteNote(
  athleteId: string,
  body: string,
): Promise<string> {
  const [row] = await db
    .insert(athleteNotes)
    .values({ athleteId, body })
    .returning({ id: athleteNotes.id });
  return row.id;
}

// ── Plans ─────────────────────────────────────────────────────────────────────

export async function deletePlan(planId: string): Promise<boolean> {
  const rows = await db
    .delete(trainingPlans)
    .where(eq(trainingPlans.id, planId))
    .returning({ id: trainingPlans.id });
  return rows.length > 0;
}
