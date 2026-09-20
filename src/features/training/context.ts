import { entryKataIds } from "@/features/competitions/entry";
import { ENTRY_ROUNDS } from "@/features/competitions/schema";
import { calculateAge, getCategories } from "@/lib/categories";
import { getAthleteById } from "@/lib/queries/athletes";
import { getAthleteReflections } from "@/lib/queries/competition-reflections";
import { getAthleteCompetitions } from "@/lib/queries/competitions";
import {
  getCompletedFeedbackForms,
  getFeedbackActionItems,
  getFeedbackGoals,
} from "@/lib/queries/feedback";
import { getAthleteKata, getKataLibrary } from "@/lib/queries/kata";
import {
  getLatestCardsPerKata,
  getScoringSeriesByKata,
} from "@/lib/queries/scoring";
import {
  getActivePlan,
  getTimingLookup,
  listAvailability,
  listLearnings,
  listSessions,
  listTimings,
  type SessionRow,
} from "@/lib/queries/training";
import { weeklyVli, type WeekVli } from "./progress";
import { allowedSplits } from "./schema";
import {
  addDays,
  isSessionDone,
  sessionDurationSec,
  sessionVli,
  weekStartOf,
  type MissingTiming,
  type TimingLookup,
  type Vli,
} from "./vli";

// The one call the training-planning skill makes first. Assembles everything the
// AI needs to know "where we stand" from the shared query helpers (convention 4).

export type SessionWithVli = SessionRow & {
  vli: Vli;
  durationSec: number | null;
  missingTimings: MissingTiming[];
  done: boolean;
};

export function withVli(
  s: SessionRow,
  timing: TimingLookup,
  today: string,
): SessionWithVli {
  const d = sessionDurationSec(s.blocks, timing);
  return {
    ...s,
    vli: sessionVli(s.blocks),
    durationSec: d.seconds,
    missingTimings: d.missing,
    done: isSessionDone(s, today),
  };
}

/**
 * Portal copy: coachNotes never leave the server for the athlete (convention 3).
 * Applied before rows reach client components, whose props land in the HTML.
 */
export function forPortal<S extends SessionRow>(s: S): S {
  return {
    ...s,
    coachNotes: null,
    blocks: s.blocks.map((b) => ({ ...b, coachNotes: null })),
  };
}

export async function getAthleteContext(athleteId: string, today: string) {
  const a = await getAthleteById(athleteId);
  if (!a) return null;

  const weekStart = weekStartOf(today);
  const weekEnd = addDays(weekStart, 6);
  const recentFrom = addDays(weekStart, -21);

  const [
    repertoire,
    kataLib,
    latestCards,
    series,
    feedback,
    competitions,
    reflections,
    learnings,
    availability,
    timings,
    timing,
    plan,
  ] = await Promise.all([
    getAthleteKata(athleteId),
    getKataLibrary(),
    getLatestCardsPerKata(athleteId),
    getScoringSeriesByKata(athleteId),
    getCompletedFeedbackForms(athleteId),
    getAthleteCompetitions(athleteId),
    getAthleteReflections(athleteId),
    listLearnings({ athleteId, includeGlobal: true, limit: 200 }),
    listAvailability(athleteId),
    listTimings(athleteId),
    getTimingLookup(athleteId),
    getActivePlan(athleteId, today),
  ]);

  const sessionsFrom = plan
    ? plan.startDate < recentFrom
      ? plan.startDate
      : recentFrom
    : recentFrom;
  const sessionsTo = plan && plan.endDate > weekEnd ? plan.endDate : weekEnd;
  const [sessions, goals, actions] = await Promise.all([
    listSessions(athleteId, sessionsFrom, sessionsTo),
    feedback[0] ? getFeedbackGoals(feedback[0].id) : Promise.resolve([]),
    feedback[0] ? getFeedbackActionItems(feedback[0].id) : Promise.resolve([]),
  ]);

  const kataById = new Map(kataLib.map((k) => [k.id, k]));
  const cardByKata = new Map(latestCards.map((c) => [c.kataId, c]));
  const reflectionByComp = new Map(
    reflections.map((r) => [r.competitionId, r]),
  );

  const recentWeeks: WeekVli[] = weeklyVli({
    sessions,
    planWeeks: plan?.weeks ?? [],
    today,
    from: recentFrom,
    to: weekEnd,
  });

  return {
    today,
    athlete: {
      id: a.id,
      firstName: a.firstName,
      lastName: a.lastName,
      age: calculateAge(new Date(a.dateOfBirth)),
      categories: getCategories(new Date(a.dateOfBirth)),
      gender: a.gender,
      beltRank: a.beltRank,
      yearsTraining: a.yearsTraining,
      yearsCompeting: a.yearsCompeting,
      heightCm: a.heightCm,
      weightKg: a.weightKg,
      notes: a.notes,
      physicalNotes: a.physicalNotes,
      isActive: a.isActive,
    },
    repertoire: repertoire.map((r) => {
      const k = kataById.get(r.kataId);
      const card = cardByKata.get(r.kataId) ?? null;
      const s = series.get(r.kataId) ?? [];
      return {
        kataId: r.kataId,
        kataName: r.kataName,
        category: r.category,
        flexibilityCategory: r.flexibilityCategory,
        allowedSplits: k ? allowedSplits(k) : ["full"],
        roundOrder: r.roundOrder,
        isCompetitionKata: r.isCompetitionKata,
        notes: r.notes,
        latestOverall: s.at(-1) ?? null,
        previousOverall: s.at(-2) ?? null,
        latestCard: card
          ? {
              id: card.id,
              assessmentDate: card.assessmentDate,
              priorityImprovements: card.priorityImprovements,
              strengths: card.strengths,
              kataSpecificNotes: card.kataSpecificNotes,
              coachNotes: card.coachNotes,
            }
          : null,
      };
    }),
    latestMeeting: feedback[0]
      ? {
          id: feedback[0].id,
          meetingDate: feedback[0].meetingDate,
          formType: feedback[0].formType,
          coachStrength: feedback[0].coachStrength,
          coachDevelopmentArea: feedback[0].coachDevelopmentArea,
          kataFocus: feedback[0].kataFocus,
          periodizationNotes: feedback[0].periodizationNotes,
          physicalPlan: feedback[0].physicalPlan,
        }
      : null,
    goals: goals
      .filter((g) => g.status === "active")
      .map((g) => ({ id: g.id, category: g.category, text: g.text })),
    openActions: actions
      .filter((x) => x.coachDisposition === "pending")
      .map((x) => ({ id: x.id, text: x.text, kataName: x.kataName })),
    competitions: competitions.slice(0, 3).map((row) => {
      const e = row.entry;
      const refl = reflectionByComp.get(e.competitionId) ?? null;
      return {
        competitionId: e.competitionId,
        name: row.competitionName,
        date: row.competitionDate,
        type: row.competitionType,
        category: e.category,
        placement: e.resultPlacement,
        roundReached: e.resultRoundReached,
        katas: ENTRY_ROUNDS.map((r) => ({
          round: r.labelKey,
          kataName: kataById.get(e[r.kata] ?? "")?.name ?? null,
          result: e[r.result],
        })).filter((k) => k.kataName),
        kataIds: entryKataIds(e),
        feedback: {
          before: e.feedbackBefore,
          performance: e.feedbackPerformance,
          improvement: e.feedbackImprovement,
          lesson: e.feedbackLesson,
        },
        coachNotes: e.coachNotes,
        reflection: refl
          ? {
              overallRating: refl.overallRating,
              before: refl.reflectionBefore,
              performance: refl.reflectionPerformance,
              improvement: refl.reflectionImprovement,
              lesson: refl.reflectionLesson,
              notes: refl.reflectionNotes,
            }
          : null,
      };
    }),
    learnings: learnings.map((l) => ({
      id: l.id,
      body: l.body,
      tags: l.tags,
      source: l.source,
      sourceId: l.sourceId,
      author: l.author,
      createdAt: l.createdAt,
      global: l.athleteId === null,
    })),
    availability,
    timings: timings.map((t) => ({
      kataId: t.kataId,
      kataName: t.kataName,
      split: t.split,
      sectionIndex: t.sectionIndex,
      seconds: t.seconds,
      isDefault: t.isDefault,
    })),
    activePlan: plan
      ? {
          id: plan.id,
          name: plan.name,
          startDate: plan.startDate,
          endDate: plan.endDate,
          targetCompetitionId: plan.targetCompetitionId,
          notes: plan.notes,
          weeks: plan.weeks,
          thisWeek: recentWeeks.find((w) => w.weekStart === weekStart) ?? null,
        }
      : null,
    thisWeekSessions: sessions
      .filter((s) => s.date >= weekStart && s.date <= weekEnd)
      .map((s) => withVli(s, timing, today)),
    recentWeeks,
  };
}

export type AthleteContext = NonNullable<
  Awaited<ReturnType<typeof getAthleteContext>>
>;
