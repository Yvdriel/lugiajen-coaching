import { and, asc, desc, eq, ilike, or, sql } from "drizzle-orm";
import {
  athleteNotes,
  athletes,
  competitionEntries,
  feedbackForms,
} from "@/db/schema";
import { calculateAge, getCategories, type Category } from "@/lib/categories";
import { db } from "@/lib/db";

// Shared athlete reads (convention 4).

export type AthleteListItem = {
  id: string;
  firstName: string;
  lastName: string;
  beltRank: string;
  gender: "male" | "female";
  isActive: boolean;
  dateOfBirth: string;
  age: number;
  categories: Category[];
  lastFeedbackDate: string | null;
  competitionCount: number;
};

export type AthleteSort = "name" | "age" | "lastFeedback" | "competitions";

export type AthleteListFilters = {
  q?: string;
  active?: "active" | "inactive" | "all";
  belt?: string;
  category?: string;
  sort?: AthleteSort;
};

export async function getAthletesList(
  filters: AthleteListFilters = {},
): Promise<AthleteListItem[]> {
  const conds = [];
  if (filters.q) {
    const pattern = `%${filters.q}%`;
    conds.push(
      or(
        ilike(athletes.firstName, pattern),
        ilike(athletes.lastName, pattern),
      ),
    );
  }
  if (filters.active === "active") conds.push(eq(athletes.isActive, true));
  if (filters.active === "inactive") conds.push(eq(athletes.isActive, false));
  if (filters.belt) conds.push(eq(athletes.beltRank, filters.belt));

  const rows = await db
    .select()
    .from(athletes)
    .where(conds.length ? and(...conds) : undefined);

  const [fb, comp] = await Promise.all([
    db
      .select({
        athleteId: feedbackForms.athleteId,
        last: sql<string>`max(${feedbackForms.meetingDate})`,
      })
      .from(feedbackForms)
      .groupBy(feedbackForms.athleteId),
    db
      .select({
        athleteId: competitionEntries.athleteId,
        n: sql<number>`count(*)::int`,
      })
      .from(competitionEntries)
      .groupBy(competitionEntries.athleteId),
  ]);
  const fbMap = new Map(fb.map((r) => [r.athleteId, r.last]));
  const compMap = new Map(comp.map((r) => [r.athleteId, r.n]));

  let items: AthleteListItem[] = rows.map((a) => ({
    id: a.id,
    firstName: a.firstName,
    lastName: a.lastName,
    beltRank: a.beltRank,
    gender: a.gender,
    isActive: a.isActive,
    dateOfBirth: a.dateOfBirth,
    age: calculateAge(new Date(a.dateOfBirth)),
    categories: getCategories(new Date(a.dateOfBirth)),
    lastFeedbackDate: fbMap.get(a.id) ?? null,
    competitionCount: compMap.get(a.id) ?? 0,
  }));

  // Category is derived → filter in memory.
  if (filters.category) {
    items = items.filter((i) =>
      i.categories.includes(filters.category as Category),
    );
  }

  switch (filters.sort) {
    case "age":
      items.sort((a, b) => b.age - a.age);
      break;
    case "lastFeedback":
      items.sort((a, b) =>
        (b.lastFeedbackDate ?? "").localeCompare(a.lastFeedbackDate ?? ""),
      );
      break;
    case "competitions":
      items.sort((a, b) => b.competitionCount - a.competitionCount);
      break;
    default:
      items.sort((a, b) =>
        `${a.lastName} ${a.firstName}`.localeCompare(
          `${b.lastName} ${b.firstName}`,
          "nl",
        ),
      );
  }

  return items;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getAthleteById(id: string) {
  // Malformed path segments shouldn't 500 on the uuid cast — treat as not found.
  if (!UUID_RE.test(id)) return null;
  const [a] = await db.select().from(athletes).where(eq(athletes.id, id));
  return a ?? null;
}

/**
 * Resolve a public `view_token` → athlete (Ch10 portal). Tokens are uuids
 * (`crypto.randomUUID`, incl. after rotation); a malformed token is just a miss,
 * never a 500. No `isActive` gate — a shared link keeps working for parents.
 */
export async function getAthleteByViewToken(token: string) {
  if (!UUID_RE.test(token)) return null;
  const [a] = await db
    .select()
    .from(athletes)
    .where(eq(athletes.viewToken, token));
  return a ?? null;
}

export async function getAthleteNotes(athleteId: string) {
  return db
    .select()
    .from(athleteNotes)
    .where(eq(athleteNotes.athleteId, athleteId))
    .orderBy(desc(athleteNotes.createdAt));
}

export async function getDistinctBelts(): Promise<string[]> {
  const rows = await db
    .selectDistinct({ belt: athletes.beltRank })
    .from(athletes)
    .orderBy(asc(athletes.beltRank));
  return rows.map((r) => r.belt);
}
