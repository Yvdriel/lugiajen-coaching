import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { ENTRY_ROUNDS } from "@/features/competitions/schema";
import { computeOverall } from "@/features/scoring/criteria";
import { scoringCardSchema } from "@/features/scoring/schema";
import { CATEGORY_VALUES, getCategories } from "@/lib/categories";
import { getAthleteById, getAthletesList } from "@/lib/queries/athletes";
import { getAthleteCompetitions } from "@/lib/queries/competitions";
import {
  getCompletedFeedbackForms,
  getFeedbackActionItemsByFeedbackIds,
  getFeedbackForms,
  getFeedbackGoalsByFeedbackIds,
  getFeedbackKataRatingsByAthlete,
} from "@/lib/queries/feedback";
import { getKataLibrary } from "@/lib/queries/kata";
import {
  getLatestCardsPerKata,
  getScoringHistory,
} from "@/lib/queries/scoring";
import {
  getActivePlan,
  listAvailability,
  listLearnings,
  listSessions,
} from "@/lib/queries/training";
import {
  addAthleteNote,
  addCompetitionEntry,
  assignKata,
  createCompetition,
  createScoringCard,
  getCompetitionDetail,
  listAllScoringCards,
  listCompetitionsDetailed,
  removeAthleteKata,
  updateAthleteKata,
  updateAthleteNotes,
  updateCompetition,
  updateCompetitionEntry,
} from "./mcp-data";
import { weeklyVli } from "./progress";
import { buildTimeline } from "./timeline";
import { addDays, todayIso, weekStartOf } from "./vli";

// Coaching-side MCP tools: competitions, scoring cards, repertoire, athlete notes,
// feedback reads, timeline and group overview. Training tools live in mcp.ts.

type ToolResult = {
  content: { type: "text"; text: string }[];
  isError?: boolean;
};
const ok = (data: unknown): ToolResult => ({
  content: [{ type: "text", text: JSON.stringify(data, null, 1) }],
});
const fail = (message: string): ToolResult => ({
  content: [{ type: "text", text: message }],
  isError: true,
});
async function guard(fn: () => Promise<ToolResult>): Promise<ToolResult> {
  try {
    return await fn();
  } catch (e) {
    return fail(e instanceof Error ? e.message : String(e));
  }
}

const uuid = z.uuid();
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const competitionType = z.enum([
  "club",
  "regional",
  "national",
  "international",
]);
const roundResult = z.enum(["win", "loss"]);
const score = z.number().int().min(0).max(100);

const entryPatchSchema = z.object({
  category: z.enum(CATEGORY_VALUES).optional(),
  resultPlacement: z.number().int().min(1).max(99).nullable().optional(),
  resultRoundReached: z.string().max(80).nullable().optional(),
  kataRound1: uuid.nullable().optional(),
  kataRound1Result: roundResult.nullable().optional(),
  kataRound2: uuid.nullable().optional(),
  kataRound2Result: roundResult.nullable().optional(),
  kataRound3: uuid.nullable().optional(),
  kataRound3Result: roundResult.nullable().optional(),
  kataRound4: uuid.nullable().optional(),
  kataRound4Result: roundResult.nullable().optional(),
  kataFinal: uuid.nullable().optional(),
  kataFinalResult: roundResult.nullable().optional(),
  feedbackBefore: z.string().max(4000).nullable().optional(),
  feedbackPerformance: z.string().max(4000).nullable().optional(),
  feedbackImprovement: z.string().max(4000).nullable().optional(),
  feedbackLesson: z.string().max(4000).nullable().optional(),
  coachNotes: z.string().max(4000).nullable().optional(),
});

function entryView(e: Record<string, unknown>, kataNames: Map<string, string>) {
  return {
    ...e,
    rounds: ENTRY_ROUNDS.map((r) => ({
      round: r.labelKey,
      kataId: e[r.kata] ?? null,
      kataName: kataNames.get(String(e[r.kata] ?? "")) ?? null,
      result: e[r.result] ?? null,
    })).filter((r) => r.kataId),
  };
}

export function registerCoachingTools(server: McpServer): void {
  // ── Competitions ────────────────────────────────────────────────────────────

  server.registerTool(
    "list_competitions",
    {
      title: "List competitions",
      description:
        "Competitions with all entries (athlete, category, kata per round with win/loss, placement, feedback, coach notes, athlete reflection). Defaults to the last 12 months and everything upcoming. athleteId narrows to that athlete's entries.",
      inputSchema: z.object({
        from: isoDate.optional(),
        to: isoDate.optional(),
        athleteId: uuid.optional(),
      }),
    },
    ({ from, to, athleteId }) =>
      guard(async () => {
        const today = todayIso();
        const [comps, lib] = await Promise.all([
          listCompetitionsDetailed({
            from: from ?? addDays(today, -365),
            to,
            athleteId,
          }),
          getKataLibrary(),
        ]);
        const names = new Map(lib.map((k) => [k.id, k.name]));
        return ok(
          comps.map((c) => ({
            ...c,
            upcoming: c.date >= today,
            entries: c.entries.map((e) => entryView(e, names)),
          })),
        );
      }),
  );

  server.registerTool(
    "get_competition",
    {
      title: "Get competition",
      description: "One competition with its entries and reflections.",
      inputSchema: z.object({ competitionId: uuid }),
    },
    ({ competitionId }) =>
      guard(async () => {
        const [c, lib] = await Promise.all([
          getCompetitionDetail(competitionId),
          getKataLibrary(),
        ]);
        if (!c) return fail("Unknown competition.");
        const names = new Map(lib.map((k) => [k.id, k.name]));
        return ok({ ...c, entries: c.entries.map((e) => entryView(e, names)) });
      }),
  );

  server.registerTool(
    "create_competition",
    {
      title: "Create competition",
      description:
        "Create a competition (name, date, type club|regional|national|international, location, notes). Returns competitionId; use it as create_plan.targetCompetitionId.",
      inputSchema: z.object({
        name: z.string().min(1).max(200),
        date: isoDate,
        competitionType,
        location: z.string().max(200).optional(),
        notes: z.string().max(4000).optional(),
      }),
    },
    (input) =>
      guard(async () => ok({ competitionId: await createCompetition(input) })),
  );

  server.registerTool(
    "update_competition",
    {
      title: "Update competition",
      description: "Update competition fields.",
      inputSchema: z.object({
        competitionId: uuid,
        name: z.string().min(1).max(200).optional(),
        date: isoDate.optional(),
        competitionType: competitionType.optional(),
        location: z.string().max(200).nullable().optional(),
        notes: z.string().max(4000).nullable().optional(),
      }),
    },
    ({ competitionId, ...patch }) =>
      guard(async () => {
        if (!(await getCompetitionDetail(competitionId)))
          return fail("Unknown competition.");
        await updateCompetition(competitionId, patch);
        return ok(await getCompetitionDetail(competitionId));
      }),
  );

  server.registerTool(
    "add_competition_entry",
    {
      title: "Add competition entry",
      description:
        "Enter an athlete in a competition in one category (U10|U12|U14|Cadets|Juniors|U21|Senior). The category must be one the athlete is age-eligible for. One entry per athlete per category. Returns entryId.",
      inputSchema: z.object({
        competitionId: uuid,
        athleteId: uuid,
        category: z.enum(CATEGORY_VALUES),
      }),
    },
    ({ competitionId, athleteId, category }) =>
      guard(async () => {
        const [c, a] = await Promise.all([
          getCompetitionDetail(competitionId),
          getAthleteById(athleteId),
        ]);
        if (!c) return fail("Unknown competition.");
        if (!a) return fail("Unknown athlete.");
        const eligible = getCategories(
          new Date(a.dateOfBirth),
          new Date(c.date),
        );
        if (!eligible.includes(category))
          return fail(
            `${a.firstName} is not eligible for ${category} on ${c.date} (eligible: ${eligible.join(", ")}).`,
          );
        const id = await addCompetitionEntry({
          competitionId,
          athleteId,
          category,
        });
        return id
          ? ok({ entryId: id })
          : fail("Athlete already entered in that category.");
      }),
  );

  server.registerTool(
    "update_competition_entry",
    {
      title: "Update competition entry",
      description:
        "Post-event write: kata per round (kataRound1..4, kataFinal as kata ids from the athlete's repertoire) with win|loss results, placement, round reached, the four feedback fields (before, performance, improvement, lesson) and coach notes. null clears a field.",
      inputSchema: z.object({ entryId: uuid }).extend(entryPatchSchema.shape),
    },
    ({ entryId, ...patch }) =>
      guard(async () => {
        if (Object.keys(patch).length === 0) return fail("Nothing to update.");
        const row = await updateCompetitionEntry(entryId, patch);
        if (!row) return fail("Unknown entry.");
        const lib = await getKataLibrary();
        return ok(entryView(row, new Map(lib.map((k) => [k.id, k.name]))));
      }),
  );

  // ── Scoring ─────────────────────────────────────────────────────────────────

  server.registerTool(
    "get_scoring_history",
    {
      title: "Scoring history",
      description:
        "All scoring cards for one athlete + kata, newest first, with all 12 WKF criteria (0-100), derived overallImpression, and the text fields. Use to see which criteria move.",
      inputSchema: z.object({ athleteId: uuid, kataId: uuid }),
    },
    ({ athleteId, kataId }) =>
      guard(async () => ok(await getScoringHistory(athleteId, kataId))),
  );

  server.registerTool(
    "create_scoring_card",
    {
      title: "Create scoring card",
      description:
        "Append a scoring card (never edits; history is append-only). 12 criteria 0-100: stances, techniques, transitions, timing, breathing, kiai, kime, conformance, strength, speed, balance, rhythm. Overall impression is derived. Kata must be in the athlete's repertoire.",
      inputSchema: z.object({
        athleteId: uuid,
        kataId: uuid,
        assessmentDate: isoDate,
        stances: score,
        techniques: score,
        transitions: score,
        timing: score,
        breathing: score,
        kiai: score,
        kime: score,
        conformance: score,
        strength: score,
        speed: score,
        balance: score,
        rhythm: score,
        kataSpecificNotes: z.string().max(4000).optional(),
        priorityImprovements: z.string().max(4000).optional(),
        strengths: z.string().max(4000).optional(),
        coachNotes: z.string().max(4000).optional(),
      }),
    },
    ({ athleteId, kataId, ...card }) =>
      guard(async () => {
        const parsed = scoringCardSchema.safeParse(card);
        if (!parsed.success)
          return fail(parsed.error.issues.map((i) => i.message).join("\n"));
        const id = await createScoringCard(athleteId, kataId, parsed.data);
        const [latest] = await getScoringHistory(athleteId, kataId);
        return ok({ cardId: id, overallImpression: latest?.overallImpression });
      }),
  );

  // ── Repertoire ──────────────────────────────────────────────────────────────

  server.registerTool(
    "assign_kata",
    {
      title: "Assign kata",
      description:
        "Add a kata to an athlete's repertoire. roundOrder = competition round order (1 = first round). Returns athleteKataId.",
      inputSchema: z.object({
        athleteId: uuid,
        kataId: uuid,
        roundOrder: z.number().int().min(1).max(20).optional(),
        isCompetitionKata: z.boolean().default(false),
        notes: z.string().max(2000).optional(),
      }),
    },
    (input) =>
      guard(async () => {
        const id = await assignKata(input);
        return id
          ? ok({ athleteKataId: id })
          : fail("Kata already in repertoire.");
      }),
  );

  server.registerTool(
    "update_athlete_kata",
    {
      title: "Update athlete kata",
      description:
        "Change round order, competition flag or notes of a repertoire row (athleteKataId = repertoire row id from get_athlete_context). null clears.",
      inputSchema: z.object({
        athleteKataId: uuid,
        roundOrder: z.number().int().min(1).max(20).nullable().optional(),
        isCompetitionKata: z.boolean().optional(),
        notes: z.string().max(2000).nullable().optional(),
      }),
    },
    ({ athleteKataId, ...patch }) =>
      guard(async () =>
        (await updateAthleteKata(athleteKataId, patch))
          ? ok({ updated: athleteKataId })
          : fail("Unknown repertoire row."),
      ),
  );

  server.registerTool(
    "remove_athlete_kata",
    {
      title: "Remove athlete kata",
      description:
        "Remove a kata from the repertoire. Scoring history for it stays.",
      inputSchema: z.object({ athleteKataId: uuid }),
    },
    ({ athleteKataId }) =>
      guard(async () =>
        (await removeAthleteKata(athleteKataId))
          ? ok({ removed: athleteKataId })
          : fail("Unknown repertoire row."),
      ),
  );

  // ── Athlete ─────────────────────────────────────────────────────────────────

  server.registerTool(
    "update_athlete_notes",
    {
      title: "Update athlete notes",
      description:
        "Replace the athlete's general notes and/or physicalNotes (current injuries, limitations, flexibility). These are the current-state summaries shown in the app; history goes in learnings.",
      inputSchema: z.object({
        athleteId: uuid,
        notes: z.string().max(8000).nullable().optional(),
        physicalNotes: z.string().max(8000).nullable().optional(),
      }),
    },
    ({ athleteId, ...patch }) =>
      guard(async () =>
        (await updateAthleteNotes(athleteId, patch))
          ? ok({ updated: athleteId })
          : fail("Unknown athlete."),
      ),
  );

  server.registerTool(
    "add_athlete_note",
    {
      title: "Add athlete note",
      description:
        "Append a timestamped coach observation to the Notities log (free text, coach-authored). For AI insights use add_learning.",
      inputSchema: z.object({
        athleteId: uuid,
        body: z.string().min(1).max(4000),
      }),
    },
    ({ athleteId, body }) =>
      guard(async () => {
        if (!(await getAthleteById(athleteId))) return fail("Unknown athlete.");
        return ok({ noteId: await addAthleteNote(athleteId, body) });
      }),
  );

  // ── Feedback ────────────────────────────────────────────────────────────────

  server.registerTool(
    "list_feedback",
    {
      title: "List feedback gesprekken",
      description:
        "All parent-meeting forms for an athlete, newest first, with goals (status), action items (coach disposition) and the athlete's kata self-ratings. includeDrafts adds forms still awaiting the athlete.",
      inputSchema: z.object({
        athleteId: uuid,
        includeDrafts: z.boolean().default(false),
      }),
    },
    ({ athleteId, includeDrafts }) =>
      guard(async () => {
        const forms = includeDrafts
          ? await getFeedbackForms(athleteId)
          : await getCompletedFeedbackForms(athleteId);
        const ids = forms.map((f) => f.id);
        const [goals, actions, ratings] = await Promise.all([
          getFeedbackGoalsByFeedbackIds(ids),
          getFeedbackActionItemsByFeedbackIds(ids),
          getFeedbackKataRatingsByAthlete(athleteId),
        ]);
        return ok(
          forms.map((f) => ({
            ...f,
            prepareToken: undefined,
            goals: goals.get(f.id) ?? [],
            actionItems: actions.get(f.id) ?? [],
            kataRatings: ratings.get(f.id) ?? [],
          })),
        );
      }),
  );

  // ── Cross-cutting reads ─────────────────────────────────────────────────────

  server.registerTool(
    "get_athlete_timeline",
    {
      title: "Athlete timeline",
      description:
        "Everything that happened to one athlete between two dates, newest first: sessions (VLI, done/skipped/planned), competitions (placement, lesson), scoring cards, feedback gesprekken, learnings. Default: since the last completed gesprek, or 90 days.",
      inputSchema: z.object({
        athleteId: uuid,
        from: isoDate.optional(),
        to: isoDate.optional(),
      }),
    },
    ({ athleteId, from, to }) =>
      guard(async () => {
        const today = todayIso();
        const feedback = await getCompletedFeedbackForms(athleteId);
        const start = from ?? feedback[0]?.meetingDate ?? addDays(today, -90);
        const end = to ?? addDays(today, 14);
        const [sessions, comps, cards, learnings] = await Promise.all([
          listSessions(athleteId, start, end),
          getAthleteCompetitions(athleteId),
          listAllScoringCards(athleteId),
          listLearnings({ athleteId, includeGlobal: false, limit: 500 }),
        ]);
        return ok(
          buildTimeline({
            sessions,
            competitions: comps.map((r) => ({
              id: r.entry.id,
              date: r.competitionDate,
              name: r.competitionName,
              category: r.entry.category,
              placement: r.entry.resultPlacement,
              roundReached: r.entry.resultRoundReached,
              lesson: r.entry.feedbackLesson,
            })),
            cards: cards.map((c) => ({
              ...c.card,
              kataName: c.kataName,
              overallImpression: computeOverall(c.card),
            })),
            feedback,
            learnings,
            today,
            from: start,
            to: end,
          }),
        );
      }),
  );

  server.registerTool(
    "get_group_overview",
    {
      title: "Group overview",
      description:
        "Every active athlete in one table: age, categories, this week's load vs plan target, sessions done/planned this week, last scoring card date, next competition, open action items, availability. Use to decide who needs attention or to plan a group session.",
      inputSchema: z.object({}),
    },
    () =>
      guard(async () => {
        const today = todayIso();
        const ws = weekStartOf(today);
        const we = addDays(ws, 6);
        const athletes = await getAthletesList({ active: "active" });
        const rows = await Promise.all(
          athletes.map(async (a) => {
            const [sessions, plan, cards, comps, feedback, availability] =
              await Promise.all([
                listSessions(a.id, ws, we),
                getActivePlan(a.id, today),
                getLatestCardsPerKata(a.id),
                getAthleteCompetitions(a.id),
                getCompletedFeedbackForms(a.id),
                listAvailability(a.id),
              ]);
            const [week] = weeklyVli({
              sessions,
              planWeeks: plan?.weeks ?? [],
              today,
              from: ws,
              to: we,
            });
            const actions = feedback[0]
              ? ((
                  await getFeedbackActionItemsByFeedbackIds([feedback[0].id])
                ).get(feedback[0].id) ?? [])
              : [];
            const next = comps
              .filter((c) => c.competitionDate >= today)
              .sort((x, y) =>
                x.competitionDate < y.competitionDate ? -1 : 1,
              )[0];
            return {
              athleteId: a.id,
              name: `${a.firstName} ${a.lastName}`,
              age: a.age,
              categories: a.categories,
              plan: plan ? { id: plan.id, name: plan.name } : null,
              thisWeek: {
                load: week.total.load,
                intensity: week.total.intensity,
                targetLoad: week.target?.targetLoad ?? null,
                sessionsDone: week.sessionsDone,
                sessionsPlanned: week.sessionsPlanned,
                sessionsSkipped: week.sessionsSkipped,
              },
              lastCardDate:
                cards
                  .map((c) => c.assessmentDate)
                  .sort()
                  .at(-1) ?? null,
              nextCompetition: next
                ? { name: next.competitionName, date: next.competitionDate }
                : null,
              openActions: actions.filter(
                (x) => x.coachDisposition === "pending",
              ).length,
              lastFeedbackDate: a.lastFeedbackDate,
              availability: availability.map((s) => ({
                weekday: s.weekday,
                minutes: s.minutes,
                label: s.label,
                coachLed: s.coachLed,
              })),
            };
          }),
        );
        return ok(rows);
      }),
  );
}
