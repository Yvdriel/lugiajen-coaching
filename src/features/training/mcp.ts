import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { getAthletesList } from "@/lib/queries/athletes";
import { getKataLibrary } from "@/lib/queries/kata";
import { getScoringHistory } from "@/lib/queries/scoring";
import {
  addLearning,
  createPlan,
  createSession,
  deleteSession,
  getActivePlan,
  getPlanById,
  getSessionById,
  getTimingLookup,
  listLearnings,
  listSessions,
  replaceAvailability,
  replaceSessionBlocks,
  setSessionSkipped,
  updateBlock,
  updatePlan,
  updateSession,
  upsertTimings,
} from "@/lib/queries/training";
import { getAthleteContext, withVli } from "./context";
import { kataProgress, weeklyVli } from "./progress";
import {
  allowedSplits,
  availabilityInputSchema,
  blockInputSchema,
  learningInputSchema,
  planInputSchema,
  planWeekInputSchema,
  sessionInputSchema,
  timingInputSchema,
  validateBlockSplit,
  type BlockInput,
} from "./schema";
import { addDays, todayIso, weekStartOf } from "./vli";

// MCP tool surface for Claude Code (ADR 0001). Narrow domain tools, no raw SQL.
// Reads cover everything; writes cover plans, sessions, blocks, learnings,
// timings and availability. Scoring cards, competitions and feedback are UI writes.

type ToolResult = {
  content: { type: "text"; text: string }[];
  isError?: boolean;
};

function ok(data: unknown): ToolResult {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 1) }] };
}

function fail(message: string): ToolResult {
  return { content: [{ type: "text", text: message }], isError: true };
}

async function guard(fn: () => Promise<ToolResult>): Promise<ToolResult> {
  try {
    return await fn();
  } catch (e) {
    return fail(e instanceof Error ? e.message : String(e));
  }
}

/** Every kata block must use a split the kata allows. Returns messages, [] when fine. */
async function splitErrors(blocks: BlockInput[]): Promise<string[]> {
  const lib = await getKataLibrary();
  const byId = new Map(lib.map((k) => [k.id, k]));
  const errors: string[] = [];
  blocks.forEach((b, i) => {
    if (!b.kataId) return;
    const k = byId.get(b.kataId);
    if (!k) {
      errors.push(`Block ${i + 1}: unknown kataId ${b.kataId}.`);
      return;
    }
    const msg = validateBlockSplit(b, k);
    if (msg) errors.push(`Block ${i + 1}: ${msg}`);
  });
  return errors;
}

const uuid = z.uuid();
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export function registerTrainingTools(server: McpServer): void {
  // ── Reads ───────────────────────────────────────────────────────────────────

  server.registerTool(
    "list_athletes",
    {
      title: "List athletes",
      description:
        "All athletes with age, WKF categories and competition count. Use to find an athleteId.",
      inputSchema: z.object({
        activeOnly: z.boolean().default(true),
      }),
    },
    ({ activeOnly }) =>
      guard(async () => {
        const rows = await getAthletesList({
          active: activeOnly ? "active" : "all",
        });
        return ok(
          rows.map((a) => ({
            id: a.id,
            name: `${a.firstName} ${a.lastName}`,
            age: a.age,
            categories: a.categories,
            beltRank: a.beltRank,
            isActive: a.isActive,
            competitionCount: a.competitionCount,
            lastFeedbackDate: a.lastFeedbackDate,
          })),
        );
      }),
  );

  server.registerTool(
    "get_kata_library",
    {
      title: "Kata library",
      description:
        "All Shotokan kata with category (competition/development), flexibility category A/B/C and allowedSplits. Blocks may only use a split listed here for that kata.",
      inputSchema: z.object({}),
    },
    () =>
      guard(async () => {
        const lib = await getKataLibrary();
        return ok(
          lib.map((k) => ({
            id: k.id,
            name: k.name,
            category: k.category,
            flexibilityCategory: k.flexibilityCategory,
            allowedSplits: allowedSplits(k),
          })),
        );
      }),
  );

  server.registerTool(
    "get_athlete_context",
    {
      title: "Athlete context",
      description:
        "CALL THIS FIRST for any planning or analysis. One payload: profile + physical notes, repertoire with allowedSplits and latest scoring, active goals and open action items, last 3 competitions with reflections, all learnings (athlete + global), availability, section timings, active plan with this week's target, this week's sessions with computed VLI and duration, and the last 4 weeks of VLI.",
      inputSchema: z.object({ athleteId: uuid }),
    },
    ({ athleteId }) =>
      guard(async () => {
        const ctx = await getAthleteContext(athleteId, todayIso());
        return ctx ? ok(ctx) : fail("Unknown athlete.");
      }),
  );

  server.registerTool(
    "list_sessions",
    {
      title: "List sessions",
      description:
        "Sessions (planned and done) for an athlete between two dates inclusive, each with blocks, computed VLI, estimated duration (durationSec, null when missingTimings is non-empty) and done flag.",
      inputSchema: z.object({ athleteId: uuid, from: isoDate, to: isoDate }),
    },
    ({ athleteId, from, to }) =>
      guard(async () => {
        const [sessions, timing] = await Promise.all([
          listSessions(athleteId, from, to),
          getTimingLookup(athleteId),
        ]);
        const today = todayIso();
        return ok(sessions.map((s) => withVli(s, timing, today)));
      }),
  );

  server.registerTool(
    "get_weekly_vli",
    {
      title: "Weekly VLI",
      description:
        "Per ISO week (Monday start) for the last N weeks including the current one: sessions done/skipped/planned, total volume/load/intensity, per-kata VLI, and the active plan's target for that week when there is one.",
      inputSchema: z.object({
        athleteId: uuid,
        weeks: z.number().int().min(1).max(26).default(4),
      }),
    },
    ({ athleteId, weeks }) =>
      guard(async () => {
        const today = todayIso();
        const to = addDays(weekStartOf(today), 6);
        const from = addDays(weekStartOf(today), -7 * (weeks - 1));
        const [sessions, plan] = await Promise.all([
          listSessions(athleteId, from, to),
          getActivePlan(athleteId, today),
        ]);
        return ok(
          weeklyVli({
            sessions,
            planWeeks: plan?.weeks ?? [],
            today,
            from,
            to,
          }),
        );
      }),
  );

  server.registerTool(
    "get_kata_progress",
    {
      title: "Kata progress vs load",
      description:
        "Per kata: every scoring card (overall impression, delta from previous) with the VLI done between the previous card and it, split per section (e.g. 'quarter:2'), plus everything done since the last card. Judge growth vs load from these numbers.",
      inputSchema: z.object({
        athleteId: uuid,
        kataId: uuid.optional(),
      }),
    },
    ({ athleteId, kataId }) =>
      guard(async () => {
        const today = todayIso();
        const ctx = await getAthleteContext(athleteId, today);
        if (!ctx) return fail("Unknown athlete.");
        const kataIds = kataId ? [kataId] : ctx.repertoire.map((r) => r.kataId);
        const sessions = await listSessions(athleteId, "2000-01-01", today);
        const out = await Promise.all(
          kataIds.map(async (id) => {
            const cards = (await getScoringHistory(athleteId, id)).reverse();
            return {
              kataName: ctx.repertoire.find((r) => r.kataId === id)?.kataName,
              ...kataProgress({ kataId: id, cards, sessions, today }),
            };
          }),
        );
        return ok(out);
      }),
  );

  server.registerTool(
    "list_learnings",
    {
      title: "List learnings",
      description:
        "Learnings for an athlete (plus global ones when athleteId is given), or global only when athleteId is omitted. Optional tag filter.",
      inputSchema: z.object({
        athleteId: uuid.optional(),
        tag: z.string().optional(),
        limit: z.number().int().min(1).max(500).default(100),
      }),
    },
    ({ athleteId, tag, limit }) =>
      guard(async () =>
        ok(
          await listLearnings({
            athleteId: athleteId ?? null,
            includeGlobal: true,
            tag,
            limit,
          }),
        ),
      ),
  );

  // ── Writes ──────────────────────────────────────────────────────────────────

  server.registerTool(
    "create_plan",
    {
      title: "Create plan",
      description:
        "Create a training plan (period) for one athlete with optional per-week targets (weekStart = Monday, targetLoad = full-kata equivalents per kata per session, targetIntensity 1..5 in halves, character e.g. 'Loading'). Returns planId.",
      inputSchema: planInputSchema,
    },
    (input) => guard(async () => ok({ planId: await createPlan(input) })),
  );

  server.registerTool(
    "update_plan",
    {
      title: "Update plan",
      description:
        "Update plan fields. When `weeks` is given the whole week set is replaced.",
      inputSchema: z.object({
        planId: uuid,
        name: z.string().min(1).max(120).optional(),
        startDate: isoDate.optional(),
        endDate: isoDate.optional(),
        targetCompetitionId: uuid.nullable().optional(),
        notes: z.string().max(4000).optional(),
        weeks: z.array(planWeekInputSchema).max(30).optional(),
      }),
    },
    ({ planId, ...patch }) =>
      guard(async () => {
        if (!(await getPlanById(planId))) return fail("Unknown plan.");
        await updatePlan(planId, patch);
        return ok(await getPlanById(planId));
      }),
  );

  server.registerTool(
    "create_sessions",
    {
      title: "Create sessions",
      description:
        "Create the same session for one or more athletes (group training = one row per athlete). Kata blocks: split must be in the kata's allowedSplits; sections are 1-based indices within the split (e.g. third → [1,2,3] or [3]); load = reps × rounds × sections / splitSize. Non-kata blocks (warm-up, S&C, kihon): omit kataId, give label and minutes. part = 1 warm-up, 2 S&C, 3 kihon, 4 kata review, 5 technical kata, 6 workout. planId omitted → attached to the athlete's active plan on that date. Returns sessionIds per athlete.",
      inputSchema: z.object({
        athleteIds: z.array(uuid).min(1).max(20),
        session: sessionInputSchema,
      }),
    },
    ({ athleteIds, session }) =>
      guard(async () => {
        const errors = await splitErrors(session.blocks);
        if (errors.length) return fail(errors.join("\n"));
        const { blocks, ...fields } = session;
        const created = await Promise.all(
          athleteIds.map(async (athleteId) => {
            const planId =
              fields.planId ??
              (await getActivePlan(athleteId, fields.date))?.id;
            const sessionId = await createSession(
              athleteId,
              { ...fields, planId },
              blocks,
            );
            return { athleteId, sessionId, planId: planId ?? null };
          }),
        );
        return ok(created);
      }),
  );

  server.registerTool(
    "update_session",
    {
      title: "Update session",
      description:
        "Update session fields; when `blocks` is given the whole block set is replaced (same rules as create_sessions).",
      inputSchema: z.object({
        sessionId: uuid,
        date: isoDate.optional(),
        title: z.string().max(120).nullable().optional(),
        notes: z.string().max(4000).nullable().optional(),
        coachNotes: z.string().max(4000).nullable().optional(),
        planId: uuid.nullable().optional(),
        blocks: z.array(blockInputSchema).max(40).optional(),
      }),
    },
    ({ sessionId, blocks, ...patch }) =>
      guard(async () => {
        if (!(await getSessionById(sessionId))) return fail("Unknown session.");
        if (blocks) {
          const errors = await splitErrors(blocks);
          if (errors.length) return fail(errors.join("\n"));
          await replaceSessionBlocks(sessionId, blocks);
        }
        if (Object.keys(patch).length) await updateSession(sessionId, patch);
        return ok(await getSessionById(sessionId));
      }),
  );

  server.registerTool(
    "skip_session",
    {
      title: "Skip session",
      description:
        "Mark a session as not done (skipped=true) or undo that. Sessions are otherwise assumed done once their date has passed.",
      inputSchema: z.object({
        sessionId: uuid,
        skipped: z.boolean().default(true),
      }),
    },
    ({ sessionId, skipped }) =>
      guard(async () => {
        if (!(await getSessionById(sessionId))) return fail("Unknown session.");
        await setSessionSkipped(sessionId, skipped);
        return ok({ sessionId, skipped });
      }),
  );

  server.registerTool(
    "update_block",
    {
      title: "Update block",
      description:
        "Log what actually happened for one block: skipped, actualReps (overrides planned reps), notes.",
      inputSchema: z.object({
        blockId: uuid,
        skipped: z.boolean().optional(),
        actualReps: z.number().int().min(0).max(50).nullable().optional(),
        notes: z.string().max(2000).nullable().optional(),
        coachNotes: z.string().max(2000).nullable().optional(),
      }),
    },
    ({ blockId, ...patch }) =>
      guard(async () => {
        const row = await updateBlock(blockId, patch);
        return row
          ? ok(await getSessionById(row.sessionId))
          : fail("Unknown block.");
      }),
  );

  server.registerTool(
    "delete_session",
    {
      title: "Delete session",
      description: "Delete a session and its blocks.",
      inputSchema: z.object({ sessionId: uuid }),
    },
    ({ sessionId }) =>
      guard(async () => {
        if (!(await getSessionById(sessionId))) return fail("Unknown session.");
        await deleteSession(sessionId);
        return ok({ deleted: sessionId });
      }),
  );

  server.registerTool(
    "add_learning",
    {
      title: "Add learning",
      description:
        "Append a dated insight (author=ai). athleteId omitted = global coaching learning. Tags: short lowercase words (technical, physical, mental, competition, structure, ...). source + sourceId link it to a session, competition, scoring_card or feedback form. Learnings are never edited; the coach deletes wrong ones in the app.",
      inputSchema: learningInputSchema,
    },
    (input) =>
      guard(async () => ok({ learningId: await addLearning(input, "ai") })),
  );

  server.registerTool(
    "set_section_timings",
    {
      title: "Set section timings",
      description:
        "Upsert measured seconds per section for one kata. athleteId omitted = kata default used for athletes without their own timing. sectionIndex is 1-based within the split; full kata = split 'full', sectionIndex 1.",
      inputSchema: timingInputSchema,
    },
    (input) =>
      guard(async () => {
        await upsertTimings(input);
        return ok({ upserted: input.timings.length });
      }),
  );

  server.registerTool(
    "set_availability",
    {
      title: "Set availability",
      description:
        "Replace an athlete's weekly training slots (weekday 1=Mon..7=Sun, minutes, label, coachLed).",
      inputSchema: availabilityInputSchema,
    },
    (input) =>
      guard(async () => {
        await replaceAvailability(input);
        return ok({ slots: input.slots.length });
      }),
  );
}
