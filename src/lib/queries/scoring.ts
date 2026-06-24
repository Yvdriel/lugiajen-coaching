import { and, asc, desc, eq, getTableColumns, sql } from "drizzle-orm";
import { kataScoringCards } from "@/db/schema";
import { computeOverall } from "@/features/scoring/criteria";
import { db } from "@/lib/db";

// Canonical scoring-card reads (conventions 4 + 5). Append-only history: latest /
// previous / trend all derive from one ordering — assessment_date DESC, created_at DESC.
// Ch6 (charts) reuses these; do not re-query the table elsewhere.

// `overall_impression` is not stored — it is the mean of the 12 criteria, computed here
// at the read boundary and attached to every row so downstream display/PDF code is unchanged.
type ScoringCardDbRow = typeof kataScoringCards.$inferSelect;
export type ScoringCardRow = ScoringCardDbRow & { overallImpression: number };

function withOverall(row: ScoringCardDbRow): ScoringCardRow {
  return { ...row, overallImpression: computeOverall(row) };
}

/** All assessments for one athlete+kata, newest-first. */
export function getScoringHistory(
  athleteId: string,
  kataId: string,
): Promise<ScoringCardRow[]> {
  return db
    .select()
    .from(kataScoringCards)
    .where(
      and(
        eq(kataScoringCards.athleteId, athleteId),
        eq(kataScoringCards.kataId, kataId),
      ),
    )
    .orderBy(desc(kataScoringCards.assessmentDate), desc(kataScoringCards.createdAt))
    .then((rows) => rows.map(withOverall));
}

/** The current latest card for one athlete+kata — the "previous" reference a new save deltas against. */
export async function getLatestScoringCard(
  athleteId: string,
  kataId: string,
): Promise<ScoringCardRow | null> {
  const [row] = await db
    .select()
    .from(kataScoringCards)
    .where(
      and(
        eq(kataScoringCards.athleteId, athleteId),
        eq(kataScoringCards.kataId, kataId),
      ),
    )
    .orderBy(desc(kataScoringCards.assessmentDate), desc(kataScoringCards.createdAt))
    .limit(1);
  return row ? withOverall(row) : null;
}

/** Latest card per kata across an athlete's whole repertoire (ROW_NUMBER window). */
export async function getLatestCardsPerKata(
  athleteId: string,
): Promise<ScoringCardRow[]> {
  const cols = getTableColumns(kataScoringCards);
  const sq = db
    .select({
      ...cols,
      rn: sql<number>`row_number() over (partition by ${kataScoringCards.kataId} order by ${kataScoringCards.assessmentDate} desc, ${kataScoringCards.createdAt} desc)`.as(
        "rn",
      ),
    })
    .from(kataScoringCards)
    .where(eq(kataScoringCards.athleteId, athleteId))
    .as("sq");

  const rows = await db.select().from(sq).where(eq(sq.rn, 1));
  return rows.map((row) => {
    const rest = { ...row } as Record<string, unknown>;
    delete rest.rn; // drop the window helper column
    return withOverall(rest as ScoringCardDbRow);
  });
}

/** Per-kata overall-impression trajectories (oldest→newest) for the Kata-tab sparklines. */
export async function getScoringSeriesByKata(
  athleteId: string,
): Promise<Map<string, number[]>> {
  const rows = await db
    .select()
    .from(kataScoringCards)
    .where(eq(kataScoringCards.athleteId, athleteId))
    .orderBy(
      asc(kataScoringCards.assessmentDate),
      asc(kataScoringCards.createdAt),
    );

  const map = new Map<string, number[]>();
  for (const r of rows) {
    const arr = map.get(r.kataId) ?? [];
    arr.push(computeOverall(r)); // derived overall, oldest→newest
    map.set(r.kataId, arr);
  }
  return map;
}
