import "dotenv/config";
import { eq } from "drizzle-orm";
import { auth } from "../lib/auth";
import { db, pool } from "../lib/db.serverless";
import {
  athleteKata,
  athleteNotes,
  athletes,
  competitionEntries,
  competitions,
  feedbackForms,
  kata,
  kataScoringCards,
  user,
} from "./schema";

/**
 * Seed: all 23 Shotokan kata + a demo coach + one sample athlete with related
 * rows. Idempotent (re-runnable). Run with `pnpm db:seed` (sets SEED=1, which the
 * auth create-before hook requires).
 */

// Demo coach login (dev only). Documented in docs/specs/ch02-schema.md.
const COACH_EMAIL = "coach@lugiajen.nl";
const COACH_PASSWORD = "lugiajen2026";

type KataSeed = {
  name: string;
  category: "competition" | "development";
  splitQuarter: boolean;
  splitThird: boolean;
  splitHalf: boolean;
  flexibilityCategory: "A" | "B" | "C";
};

// Exact names / split flags / flex category per CLAUDE.md. sort_order = array index.
const KATA: KataSeed[] = [
  // Competition kata
  { name: "Gojushiho Sho", category: "competition", splitQuarter: true, splitThird: true, splitHalf: true, flexibilityCategory: "A" },
  { name: "Gojushiho Dai", category: "competition", splitQuarter: true, splitThird: true, splitHalf: true, flexibilityCategory: "A" },
  { name: "Kanku Sho", category: "competition", splitQuarter: true, splitThird: true, splitHalf: true, flexibilityCategory: "A" },
  { name: "Kanku Dai", category: "competition", splitQuarter: false, splitThird: true, splitHalf: true, flexibilityCategory: "B" },
  { name: "Sochin", category: "competition", splitQuarter: false, splitThird: true, splitHalf: true, flexibilityCategory: "B" },
  { name: "Unsu", category: "competition", splitQuarter: false, splitThird: true, splitHalf: true, flexibilityCategory: "B" },
  { name: "Enpi", category: "competition", splitQuarter: false, splitThird: true, splitHalf: true, flexibilityCategory: "B" },
  { name: "Gankaku", category: "competition", splitQuarter: false, splitThird: true, splitHalf: true, flexibilityCategory: "B" },
  // Development kata
  { name: "Heian Shodan", category: "development", splitQuarter: false, splitThird: false, splitHalf: true, flexibilityCategory: "C" },
  { name: "Heian Nidan", category: "development", splitQuarter: false, splitThird: false, splitHalf: true, flexibilityCategory: "C" },
  { name: "Heian Sandan", category: "development", splitQuarter: false, splitThird: false, splitHalf: true, flexibilityCategory: "C" },
  { name: "Heian Yondan", category: "development", splitQuarter: false, splitThird: false, splitHalf: true, flexibilityCategory: "C" },
  { name: "Heian Godan", category: "development", splitQuarter: false, splitThird: false, splitHalf: true, flexibilityCategory: "C" },
  { name: "Tekki Shodan", category: "development", splitQuarter: false, splitThird: false, splitHalf: true, flexibilityCategory: "C" },
  { name: "Bassai Dai", category: "development", splitQuarter: false, splitThird: true, splitHalf: true, flexibilityCategory: "B" },
  { name: "Jion", category: "development", splitQuarter: false, splitThird: true, splitHalf: true, flexibilityCategory: "B" },
  { name: "Jitte", category: "development", splitQuarter: false, splitThird: true, splitHalf: true, flexibilityCategory: "B" },
  { name: "Hangetsu", category: "development", splitQuarter: false, splitThird: true, splitHalf: true, flexibilityCategory: "B" },
  { name: "Nijushiho", category: "development", splitQuarter: false, splitThird: true, splitHalf: true, flexibilityCategory: "B" },
  { name: "Meikyo", category: "development", splitQuarter: false, splitThird: true, splitHalf: true, flexibilityCategory: "B" },
  { name: "Chinte", category: "development", splitQuarter: false, splitThird: true, splitHalf: true, flexibilityCategory: "B" },
  { name: "Bassai Sho", category: "development", splitQuarter: false, splitThird: true, splitHalf: true, flexibilityCategory: "B" },
  { name: "Wankan", category: "development", splitQuarter: false, splitThird: false, splitHalf: true, flexibilityCategory: "C" },
];

async function seedKata() {
  await db
    .insert(kata)
    .values(KATA.map((k, i) => ({ ...k, sortOrder: i + 1 })))
    .onConflictDoNothing();
  console.log(`[seed] kata ensured (${KATA.length}).`);
}

async function seedCoach() {
  const existing = await db
    .select()
    .from(user)
    .where(eq(user.email, COACH_EMAIL));
  if (existing.length > 0) {
    console.log("[seed] coach already exists.");
    return;
  }
  try {
    await auth.api.signUpEmail({
      body: {
        email: COACH_EMAIL,
        password: COACH_PASSWORD,
        name: "Coach Lu Gia Jen",
      },
    });
    console.log(`[seed] coach created (${COACH_EMAIL}).`);
  } catch (err) {
    // nextCookies may call next/headers outside a request scope; the user +
    // account rows are written before that step, so confirm and continue.
    const after = await db
      .select()
      .from(user)
      .where(eq(user.email, COACH_EMAIL));
    if (after.length === 0) throw err;
    console.warn(
      `[seed] coach created; ignored post-write warning: ${(err as Error).message}`,
    );
  }
}

async function seedSampleAthlete() {
  const FIRST = "Sample";
  const LAST = "Atleet";
  const existing = await db
    .select()
    .from(athletes)
    .where(eq(athletes.firstName, FIRST));
  if (existing.length > 0) {
    console.log("[seed] sample athlete already exists.");
    return;
  }

  const [athlete] = await db
    .insert(athletes)
    .values({
      firstName: FIRST,
      lastName: LAST,
      dateOfBirth: "2012-05-10",
      gender: "male",
      beltRank: "3e kyu",
      yearsTraining: 4,
      yearsCompeting: 2,
      heightCm: 150,
      weightKg: 40,
      notes: "Demo-atleet voor ontwikkeling.",
      physicalNotes: "Goede flexibiliteit; let op linkerenkel.",
    })
    .returning();

  const [heianYondan] = await db
    .select()
    .from(kata)
    .where(eq(kata.name, "Heian Yondan"));
  const [bassaiDai] = await db
    .select()
    .from(kata)
    .where(eq(kata.name, "Bassai Dai"));

  await db.insert(athleteKata).values([
    {
      athleteId: athlete.id,
      kataId: heianYondan.id,
      roundOrder: 1,
      isCompetitionKata: true,
      proficiency: 6,
      notes: "Sterke transitions; kime kan beter.",
    },
    {
      athleteId: athlete.id,
      kataId: bassaiDai.id,
      roundOrder: 2,
      isCompetitionKata: true,
      proficiency: 5,
    },
  ]);

  // Two assessments on distinct dates → exercises deltas in later chapters.
  await db.insert(kataScoringCards).values([
    {
      athleteId: athlete.id,
      kataId: heianYondan.id,
      assessmentDate: "2026-01-15",
      stances: 6, techniques: 6, transitions: 5, timing: 6,
      breathing: 6, kiai: 7, kime: 5, conformance: 6,
      strength: 6, speed: 6, balance: 5, rhythm: 6,
      overallImpression: 6,
      priorityImprovements: "Kime aanscherpen; balans in draaien.",
      strengths: "Goede ademhaling en kiai.",
    },
    {
      athleteId: athlete.id,
      kataId: heianYondan.id,
      assessmentDate: "2026-04-15",
      stances: 7, techniques: 7, transitions: 6, timing: 7,
      breathing: 6, kiai: 8, kime: 7, conformance: 7,
      strength: 7, speed: 7, balance: 6, rhythm: 7,
      overallImpression: 7,
      priorityImprovements: "Snelheid in eindsequentie.",
      strengths: "Kime sterk verbeterd.",
    },
  ]);

  await db.insert(feedbackForms).values({
    athleteId: athlete.id,
    formType: "U12",
    meetingNumber: 1,
    meetingDate: "2026-02-01",
    season: "2025/2026",
    athleteProudOf: "Mijn Heian Yondan.",
    athleteHardestThing: "Stilstaan na de kata.",
    athleteFunScore: 5,
    goalMain: "Elke training op tijd en gefocust.",
    action1: "Twee keer per week extra core-oefeningen.",
  });

  const [comp] = await db
    .insert(competitions)
    .values({
      name: "Clubkampioenschap 2026",
      date: "2026-03-20",
      location: "Dojo Lu Gia Jen",
      competitionType: "club",
    })
    .returning();

  await db.insert(competitionEntries).values({
    competitionId: comp.id,
    athleteId: athlete.id,
    category: "U14 Kata Individueel",
    resultPlacement: 2,
    resultRoundReached: "Finale",
    kataRound1: heianYondan.id,
    kataRound1Result: "win",
    kataFinal: bassaiDai.id,
    kataFinalResult: "loss",
    feedbackBefore: "Goed geslapen, licht zenuwachtig.",
    feedbackPerformance: "Sterke eerste ronde.",
    feedbackImprovement: "Eindstand vasthouden.",
    feedbackLesson: "Rustig blijven ademen in de finale.",
  });

  console.log("[seed] sample athlete + related rows created.");
}

async function seedSampleNote() {
  const [athlete] = await db
    .select()
    .from(athletes)
    .where(eq(athletes.firstName, "Sample"));
  if (!athlete) return;
  const existing = await db
    .select()
    .from(athleteNotes)
    .where(eq(athleteNotes.athleteId, athlete.id));
  if (existing.length > 0) {
    console.log("[seed] sample note already exists.");
    return;
  }
  await db.insert(athleteNotes).values({
    athleteId: athlete.id,
    body: "Goede focus tijdens training. Werken aan kime in Heian Yondan.",
  });
  console.log("[seed] sample note created.");
}

async function main() {
  await seedKata();
  await seedCoach();
  await seedSampleAthlete();
  await seedSampleNote();
  await pool.end();
  console.log("[seed] done.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[seed] failed:", err);
    process.exit(1);
  });
