import { desc, eq, gte, sql } from "drizzle-orm";
import {
  athletes,
  competitions,
  feedbackForms,
  kata,
  kataScoringCards,
} from "@/db/schema";
import { calculateAge, getCategories, type Category } from "@/lib/categories";
import { db } from "@/lib/db";

// Shared dashboard read helpers (convention 4) — Ch9 assembles, not re-queries.

const countExpr = sql<number>`count(*)::int`;

export type DashboardStats = {
  activeAthletes: number;
  upcomingCompetitions: number;
  totalAthletes: number;
};

export async function getDashboardStats(): Promise<DashboardStats> {
  const today = new Date().toISOString().slice(0, 10);
  const [[active], [upcoming], [total]] = await Promise.all([
    db
      .select({ n: countExpr })
      .from(athletes)
      .where(eq(athletes.isActive, true)),
    db
      .select({ n: countExpr })
      .from(competitions)
      .where(gte(competitions.date, today)),
    db.select({ n: countExpr }).from(athletes),
  ]);
  return {
    activeAthletes: active.n,
    upcomingCompetitions: upcoming.n,
    totalAthletes: total.n,
  };
}

export type AthleteCard = {
  id: string;
  firstName: string;
  lastName: string;
  beltRank: string;
  age: number;
  categories: Category[];
  lastFeedbackDate: string | null;
};

export async function getAthleteCards(): Promise<AthleteCard[]> {
  const rows = await db
    .select()
    .from(athletes)
    .where(eq(athletes.isActive, true))
    .orderBy(athletes.lastName, athletes.firstName);

  const lastFeedback = await db
    .select({
      athleteId: feedbackForms.athleteId,
      last: sql<string>`max(${feedbackForms.meetingDate})`,
    })
    .from(feedbackForms)
    .groupBy(feedbackForms.athleteId);
  const lastMap = new Map(lastFeedback.map((r) => [r.athleteId, r.last]));

  return rows.map((a) => ({
    id: a.id,
    firstName: a.firstName,
    lastName: a.lastName,
    beltRank: a.beltRank,
    age: calculateAge(new Date(a.dateOfBirth)),
    categories: getCategories(new Date(a.dateOfBirth)),
    lastFeedbackDate: lastMap.get(a.id) ?? null,
  }));
}

export type ActivityItem = {
  type: "scoring" | "feedback";
  athleteId: string;
  athleteName: string;
  label: string;
  date: Date;
};

export async function getRecentActivity(limit = 8): Promise<ActivityItem[]> {
  const cards = await db
    .select({
      athleteId: athletes.id,
      firstName: athletes.firstName,
      lastName: athletes.lastName,
      kataName: kata.name,
      createdAt: kataScoringCards.createdAt,
    })
    .from(kataScoringCards)
    .innerJoin(athletes, eq(kataScoringCards.athleteId, athletes.id))
    .innerJoin(kata, eq(kataScoringCards.kataId, kata.id))
    .orderBy(desc(kataScoringCards.createdAt))
    .limit(limit);

  const feedback = await db
    .select({
      athleteId: athletes.id,
      firstName: athletes.firstName,
      lastName: athletes.lastName,
      formType: feedbackForms.formType,
      meetingNumber: feedbackForms.meetingNumber,
      createdAt: feedbackForms.createdAt,
    })
    .from(feedbackForms)
    .innerJoin(athletes, eq(feedbackForms.athleteId, athletes.id))
    .orderBy(desc(feedbackForms.createdAt))
    .limit(limit);

  const items: ActivityItem[] = [
    ...cards.map((c) => ({
      type: "scoring" as const,
      athleteId: c.athleteId,
      athleteName: `${c.firstName} ${c.lastName}`,
      label: `Scorekaart — ${c.kataName}`,
      date: c.createdAt,
    })),
    ...feedback.map((f) => ({
      type: "feedback" as const,
      athleteId: f.athleteId,
      athleteName: `${f.firstName} ${f.lastName}`,
      label: `Feedback ${f.formType} (gesprek ${f.meetingNumber})`,
      date: f.createdAt,
    })),
  ];

  return items
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, limit);
}
