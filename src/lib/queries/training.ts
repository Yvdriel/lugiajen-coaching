import {
  and,
  asc,
  desc,
  eq,
  gte,
  inArray,
  isNull,
  lte,
  or,
  sql,
} from "drizzle-orm";
import {
  athleteAvailability,
  kata,
  kataSectionTimings,
  learnings,
  trainingBlocks,
  trainingPlanWeeks,
  trainingPlans,
  trainingSessions,
} from "@/db/schema";
import type {
  AvailabilityInput,
  BlockInput,
  LearningInput,
  PlanInput,
  SessionInput,
  TimingInput,
} from "@/features/training/schema";
import type { Split, TimingLookup } from "@/features/training/vli";
import { db } from "@/lib/db";

// Shared training reads + the writes the MCP tools use (convention 4). Validation
// happens in the caller (features/training/schema.ts); this file trusts its input.
// Multi-row writes go through db.batch (convention 1). neon-http batch cannot read a
// row it just inserted, so parents get client-side uuids.

export type PlanWeekRow = typeof trainingPlanWeeks.$inferSelect;
export type PlanRow = typeof trainingPlans.$inferSelect & {
  weeks: PlanWeekRow[];
};
export type BlockRow = typeof trainingBlocks.$inferSelect & {
  kataName: string | null;
};
export type SessionRow = typeof trainingSessions.$inferSelect & {
  blocks: BlockRow[];
};
export type LearningRow = typeof learnings.$inferSelect;
export type TimingRow = typeof kataSectionTimings.$inferSelect & {
  kataName: string;
  isDefault: boolean;
};
export type AvailabilityRow = typeof athleteAvailability.$inferSelect;

// ── Plans ─────────────────────────────────────────────────────────────────────

async function attachWeeks(
  plans: (typeof trainingPlans.$inferSelect)[],
): Promise<PlanRow[]> {
  if (plans.length === 0) return [];
  const weeks = await db
    .select()
    .from(trainingPlanWeeks)
    .where(
      inArray(
        trainingPlanWeeks.planId,
        plans.map((p) => p.id),
      ),
    )
    .orderBy(asc(trainingPlanWeeks.weekStart));
  return plans.map((p) => ({
    ...p,
    weeks: weeks.filter((w) => w.planId === p.id),
  }));
}

/** The plan covering `today` (start <= today <= end); latest start wins on overlap. */
export async function getActivePlan(
  athleteId: string,
  today: string,
): Promise<PlanRow | null> {
  const rows = await db
    .select()
    .from(trainingPlans)
    .where(
      and(
        eq(trainingPlans.athleteId, athleteId),
        lte(trainingPlans.startDate, today),
        gte(trainingPlans.endDate, today),
      ),
    )
    .orderBy(desc(trainingPlans.startDate))
    .limit(1);
  const [plan] = await attachWeeks(rows);
  return plan ?? null;
}

export async function getPlanById(planId: string): Promise<PlanRow | null> {
  const rows = await db
    .select()
    .from(trainingPlans)
    .where(eq(trainingPlans.id, planId));
  const [plan] = await attachWeeks(rows);
  return plan ?? null;
}

export async function listPlans(athleteId: string): Promise<PlanRow[]> {
  const rows = await db
    .select()
    .from(trainingPlans)
    .where(eq(trainingPlans.athleteId, athleteId))
    .orderBy(desc(trainingPlans.startDate));
  return attachWeeks(rows);
}

export async function createPlan(input: PlanInput): Promise<string> {
  const id = crypto.randomUUID();
  const insertPlan = db.insert(trainingPlans).values({
    id,
    athleteId: input.athleteId,
    name: input.name,
    startDate: input.startDate,
    endDate: input.endDate,
    targetCompetitionId: input.targetCompetitionId ?? null,
    notes: input.notes ?? null,
  });
  if (input.weeks.length === 0) {
    await insertPlan;
    return id;
  }
  await db.batch([
    insertPlan,
    db
      .insert(trainingPlanWeeks)
      .values(input.weeks.map((w) => ({ ...w, planId: id }))),
  ]);
  return id;
}

export async function updatePlan(
  planId: string,
  patch: Partial<Omit<PlanInput, "athleteId">>,
): Promise<void> {
  const { weeks, ...fields } = patch;
  const set = {
    ...(fields.name !== undefined && { name: fields.name }),
    ...(fields.startDate !== undefined && { startDate: fields.startDate }),
    ...(fields.endDate !== undefined && { endDate: fields.endDate }),
    ...(fields.targetCompetitionId !== undefined && {
      targetCompetitionId: fields.targetCompetitionId,
    }),
    ...(fields.notes !== undefined && { notes: fields.notes }),
  };
  const updatePlanStmt = db
    .update(trainingPlans)
    .set(set)
    .where(eq(trainingPlans.id, planId));
  if (weeks === undefined) {
    await updatePlanStmt;
    return;
  }
  const deleteWeeks = db
    .delete(trainingPlanWeeks)
    .where(eq(trainingPlanWeeks.planId, planId));
  if (weeks.length === 0) {
    await db.batch([updatePlanStmt, deleteWeeks]);
    return;
  }
  await db.batch([
    updatePlanStmt,
    deleteWeeks,
    db.insert(trainingPlanWeeks).values(weeks.map((w) => ({ ...w, planId }))),
  ]);
}

// ── Sessions + blocks ─────────────────────────────────────────────────────────

async function attachBlocks(
  sessions: (typeof trainingSessions.$inferSelect)[],
): Promise<SessionRow[]> {
  if (sessions.length === 0) return [];
  const rows = await db
    .select({ block: trainingBlocks, kataName: kata.name })
    .from(trainingBlocks)
    .leftJoin(kata, eq(trainingBlocks.kataId, kata.id))
    .where(
      inArray(
        trainingBlocks.sessionId,
        sessions.map((s) => s.id),
      ),
    )
    .orderBy(asc(trainingBlocks.part), asc(trainingBlocks.sortOrder));
  const blocks = rows.map((r) => ({ ...r.block, kataName: r.kataName }));
  return sessions.map((s) => ({
    ...s,
    blocks: blocks.filter((b) => b.sessionId === s.id),
  }));
}

/** Sessions in [from, to] (inclusive, YYYY-MM-DD), oldest first, blocks attached. */
export async function listSessions(
  athleteId: string,
  from: string,
  to: string,
): Promise<SessionRow[]> {
  const rows = await db
    .select()
    .from(trainingSessions)
    .where(
      and(
        eq(trainingSessions.athleteId, athleteId),
        gte(trainingSessions.date, from),
        lte(trainingSessions.date, to),
      ),
    )
    .orderBy(asc(trainingSessions.date), asc(trainingSessions.createdAt));
  return attachBlocks(rows);
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getSessionById(
  sessionId: string,
): Promise<SessionRow | null> {
  // Path segments reach here unvalidated; a malformed id is a miss, not a 500.
  if (!UUID_RE.test(sessionId)) return null;
  const rows = await db
    .select()
    .from(trainingSessions)
    .where(eq(trainingSessions.id, sessionId));
  const [s] = await attachBlocks(rows);
  return s ?? null;
}

function blockValues(sessionId: string, blocks: BlockInput[]) {
  return blocks.map((b, i) => ({
    sessionId,
    part: b.part,
    sortOrder: i,
    kataId: b.kataId ?? null,
    label: b.label ?? null,
    split: b.split ?? null,
    sections: b.sections ?? null,
    reps: b.reps ?? null,
    restRepSec: b.restRepSec ?? null,
    restSectionSec: b.restSectionSec ?? null,
    rounds: b.rounds,
    format: b.format,
    vest: b.vest,
    minutes: b.minutes ?? null,
    notes: b.notes ?? null,
    coachNotes: b.coachNotes ?? null,
  }));
}

export async function createSession(
  athleteId: string,
  input: Omit<SessionInput, "blocks">,
  blocks: BlockInput[],
): Promise<string> {
  const id = crypto.randomUUID();
  const insertSession = db.insert(trainingSessions).values({
    id,
    athleteId,
    planId: input.planId ?? null,
    date: input.date,
    title: input.title ?? null,
    notes: input.notes ?? null,
    coachNotes: input.coachNotes ?? null,
  });
  if (blocks.length === 0) {
    await insertSession;
    return id;
  }
  await db.batch([
    insertSession,
    db.insert(trainingBlocks).values(blockValues(id, blocks)),
  ]);
  return id;
}

/** Replace the whole block set (delete + insert, like feedback kata ratings). */
export async function replaceSessionBlocks(
  sessionId: string,
  blocks: BlockInput[],
): Promise<void> {
  const del = db
    .delete(trainingBlocks)
    .where(eq(trainingBlocks.sessionId, sessionId));
  if (blocks.length === 0) {
    await del;
    return;
  }
  await db.batch([
    del,
    db.insert(trainingBlocks).values(blockValues(sessionId, blocks)),
  ]);
}

export async function updateSession(
  sessionId: string,
  patch: {
    date?: string;
    title?: string | null;
    notes?: string | null;
    coachNotes?: string | null;
    planId?: string | null;
  },
): Promise<void> {
  await db
    .update(trainingSessions)
    .set(patch)
    .where(eq(trainingSessions.id, sessionId));
}

export async function setSessionSkipped(
  sessionId: string,
  skipped: boolean,
): Promise<void> {
  await db
    .update(trainingSessions)
    .set({ skippedAt: skipped ? new Date() : null })
    .where(eq(trainingSessions.id, sessionId));
}

export async function updateBlock(
  blockId: string,
  patch: {
    skipped?: boolean;
    actualReps?: number | null;
    notes?: string | null;
    coachNotes?: string | null;
  },
): Promise<{ sessionId: string } | null> {
  const [row] = await db
    .update(trainingBlocks)
    .set(patch)
    .where(eq(trainingBlocks.id, blockId))
    .returning({ sessionId: trainingBlocks.sessionId });
  return row ?? null;
}

export async function deleteSession(sessionId: string): Promise<void> {
  await db.delete(trainingSessions).where(eq(trainingSessions.id, sessionId));
}

// ── Learnings ─────────────────────────────────────────────────────────────────

/**
 * Athlete learnings, optionally with the global ones (athlete_id NULL) mixed in.
 * `athleteId: null` = global only.
 */
export async function listLearnings(opts: {
  athleteId?: string | null;
  includeGlobal?: boolean;
  tag?: string;
  limit?: number;
}): Promise<LearningRow[]> {
  const conds = [];
  if (opts.athleteId === null) conds.push(isNull(learnings.athleteId));
  else if (opts.athleteId && opts.includeGlobal)
    conds.push(
      or(eq(learnings.athleteId, opts.athleteId), isNull(learnings.athleteId)),
    );
  else if (opts.athleteId) conds.push(eq(learnings.athleteId, opts.athleteId));
  const rows = await db
    .select()
    .from(learnings)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(learnings.createdAt))
    .limit(opts.limit ?? 50);
  // Tag filter in JS: text[] containment is one more thing to get right in SQL for
  // a list that is at most `limit` rows.
  return opts.tag ? rows.filter((r) => r.tags.includes(opts.tag!)) : rows;
}

export async function addLearning(
  input: LearningInput,
  author: "coach" | "ai",
): Promise<string> {
  const [row] = await db
    .insert(learnings)
    .values({
      athleteId: input.athleteId ?? null,
      body: input.body,
      tags: input.tags,
      source: input.source,
      sourceId: input.sourceId ?? null,
      author,
    })
    .returning({ id: learnings.id });
  return row.id;
}

export async function deleteLearning(id: string): Promise<void> {
  await db.delete(learnings).where(eq(learnings.id, id));
}

// ── Section timings ───────────────────────────────────────────────────────────

/** Athlete-specific rows plus kata defaults, flagged. */
export async function listTimings(athleteId: string): Promise<TimingRow[]> {
  const rows = await db
    .select({ t: kataSectionTimings, kataName: kata.name })
    .from(kataSectionTimings)
    .innerJoin(kata, eq(kataSectionTimings.kataId, kata.id))
    .where(
      or(
        eq(kataSectionTimings.athleteId, athleteId),
        isNull(kataSectionTimings.athleteId),
      ),
    )
    .orderBy(
      asc(kata.sortOrder),
      asc(kataSectionTimings.split),
      asc(kataSectionTimings.sectionIndex),
    );
  return rows.map((r) => ({
    ...r.t,
    kataName: r.kataName,
    isDefault: r.t.athleteId === null,
  }));
}

/** Lookup closure: athlete rows override kata defaults. */
export async function getTimingLookup(
  athleteId: string,
): Promise<TimingLookup> {
  const rows = await listTimings(athleteId);
  const map = new Map<string, number>();
  for (const r of rows.filter((r) => r.isDefault))
    map.set(`${r.kataId}:${r.split}:${r.sectionIndex}`, r.seconds);
  for (const r of rows.filter((r) => !r.isDefault))
    map.set(`${r.kataId}:${r.split}:${r.sectionIndex}`, r.seconds);
  return (kataId: string, split: Split, index: number) =>
    map.get(`${kataId}:${split}:${index}`) ?? null;
}

export async function upsertTimings(input: TimingInput): Promise<void> {
  const athleteId = input.athleteId ?? null;
  await db
    .insert(kataSectionTimings)
    .values(
      input.timings.map((t) => ({
        athleteId,
        kataId: input.kataId,
        split: t.split,
        sectionIndex: t.sectionIndex,
        seconds: t.seconds,
      })),
    )
    .onConflictDoUpdate({
      target: [
        kataSectionTimings.athleteId,
        kataSectionTimings.kataId,
        kataSectionTimings.split,
        kataSectionTimings.sectionIndex,
      ],
      set: {
        seconds: sql`excluded.seconds`,
        updatedAt: new Date(),
      },
    });
}

// ── Availability ──────────────────────────────────────────────────────────────

export function listAvailability(
  athleteId: string,
): Promise<AvailabilityRow[]> {
  return db
    .select()
    .from(athleteAvailability)
    .where(eq(athleteAvailability.athleteId, athleteId))
    .orderBy(
      asc(athleteAvailability.weekday),
      asc(athleteAvailability.sortOrder),
    );
}

export async function replaceAvailability(
  input: AvailabilityInput,
): Promise<void> {
  const del = db
    .delete(athleteAvailability)
    .where(eq(athleteAvailability.athleteId, input.athleteId));
  if (input.slots.length === 0) {
    await del;
    return;
  }
  await db.batch([
    del,
    db.insert(athleteAvailability).values(
      input.slots.map((s, i) => ({
        athleteId: input.athleteId,
        weekday: s.weekday,
        minutes: s.minutes,
        label: s.label,
        coachLed: s.coachLed,
        sortOrder: i,
      })),
    ),
  ]);
}

export async function updateSessionAthleteNotes(
  sessionId: string,
  athleteNotes: string | null,
): Promise<void> {
  await db
    .update(trainingSessions)
    .set({ athleteNotes })
    .where(eq(trainingSessions.id, sessionId));
}

/** Owner lookup for the coach/portal write guards. */
export async function getBlockOwner(
  blockId: string,
): Promise<{ sessionId: string; athleteId: string } | null> {
  const [row] = await db
    .select({
      sessionId: trainingBlocks.sessionId,
      athleteId: trainingSessions.athleteId,
    })
    .from(trainingBlocks)
    .innerJoin(
      trainingSessions,
      eq(trainingBlocks.sessionId, trainingSessions.id),
    )
    .where(eq(trainingBlocks.id, blockId));
  return row ?? null;
}
