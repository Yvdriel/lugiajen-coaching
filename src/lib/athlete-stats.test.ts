import { describe, expect, it } from "vitest";
import type { CompetitionType } from "@/features/competitions/schema";
import type {
  AthleteCompetitionRow,
  CompetitionEntry,
} from "@/lib/queries/competitions";
import type { FeedbackRow } from "@/lib/queries/feedback";
import type { AthleteKataItem } from "@/lib/queries/kata";
import type { ScoringCardRow } from "@/lib/queries/scoring";
import {
  buildAthleteStats,
  competitionsByType,
  winLossPerRound,
} from "./athlete-stats";

type RowOpts = {
  type?: CompetitionType;
  placement?: number | null;
  kataRound1?: string | null;
  kataRound1Result?: "win" | "loss" | null;
  kataFinal?: string | null;
  kataFinalResult?: "win" | "loss" | null;
};

function row(o: RowOpts): AthleteCompetitionRow {
  return {
    entry: {
      resultPlacement: o.placement ?? null,
      kataRound1: o.kataRound1 ?? null,
      kataRound1Result: o.kataRound1Result ?? null,
      kataRound2: null,
      kataRound2Result: null,
      kataRound3: null,
      kataRound3Result: null,
      kataRound4: null,
      kataRound4Result: null,
      kataFinal: o.kataFinal ?? null,
      kataFinalResult: o.kataFinalResult ?? null,
    } as unknown as CompetitionEntry,
    competitionName: "Toernooi",
    competitionDate: "2026-01-01",
    competitionType: o.type ?? "club",
  };
}

const kataNames = new Map([
  ["k1", "Kanku Dai"],
  ["k2", "Bassai Dai"],
]);

describe("competitionsByType", () => {
  it("counts per type in canonical order", () => {
    const out = competitionsByType([
      row({ type: "national" }),
      row({ type: "club" }),
      row({ type: "club" }),
    ]);
    expect(out).toEqual([
      { type: "club", count: 2 },
      { type: "national", count: 1 },
    ]);
  });

  it("is empty for no rows", () => {
    expect(competitionsByType([])).toEqual([]);
  });
});

describe("winLossPerRound", () => {
  it("tallies wins/losses per round and drops empty rounds", () => {
    const out = winLossPerRound([
      row({ kataRound1: "k1", kataRound1Result: "win", kataFinal: "k2", kataFinalResult: "loss" }),
      row({ kataRound1: "k1", kataRound1Result: "win" }),
      row({ kataRound1: "k2", kataRound1Result: "loss" }),
    ]);
    expect(out).toEqual([
      { labelKey: "round1", wins: 2, losses: 1 },
      { labelKey: "final", wins: 0, losses: 1 },
    ]);
  });
});

describe("buildAthleteStats", () => {
  const repertoire = [
    { kataName: "Kanku Dai", proficiency: 8, roundOrder: 1, isCompetitionKata: true },
    { kataName: "Heian Godan", proficiency: 5, roundOrder: null, isCompetitionKata: false },
  ] as unknown as AthleteKataItem[];

  const feedback = [
    {
      goalMain: "Procesdoel A",
      goalPerformance: "",
      goalOutcome: null,
      kataFocus: "Kanku Dai",
      coachDevelopmentArea: "Standen verdiepen",
      action1: "Extra core",
      action2: null,
      action3: "",
    },
  ] as unknown as FeedbackRow[];

  const latestCards = [
    { priorityImprovements: "Snelheid in finale" },
    { priorityImprovements: "Extra core" }, // dup of action1 → deduped
    { priorityImprovements: null },
  ] as unknown as ScoringCardRow[];

  it("assembles competition + repertoire + goals + focus points", () => {
    const s = buildAthleteStats({
      competitions: [
        row({ type: "club", placement: 2, kataRound1: "k1", kataRound1Result: "win", kataFinal: "k2", kataFinalResult: "loss" }),
      ],
      repertoire,
      latestCards,
      feedback,
      kataNames,
    });

    expect(s.competition.totalEvents).toBe(1);
    expect(s.competition.podium).toEqual({ first: 0, second: 1, third: 0 });
    expect(s.competition.byType).toEqual([{ type: "club", count: 1 }]);
    expect(s.competition.rounds).toEqual([
      { labelKey: "round1", wins: 1, losses: 0 },
      { labelKey: "final", wins: 0, losses: 1 },
    ]);
    expect(s.competition.mostKata).toBe("Kanku Dai");

    // only competition kata, with proficiency
    expect(s.repertoire).toEqual([
      { kataName: "Kanku Dai", proficiency: 8, roundOrder: 1 },
    ]);

    // empty goal fields dropped
    expect(s.goals).toEqual({ goalMain: "Procesdoel A", kataFocus: "Kanku Dai" });

    // feedback-first, deduped against scoring priorities
    expect(s.focusPoints).toEqual([
      "Standen verdiepen",
      "Extra core",
      "Snelheid in finale",
    ]);
  });

  it("handles an athlete with no data", () => {
    const s = buildAthleteStats({
      competitions: [],
      repertoire: [],
      latestCards: [],
      feedback: [],
      kataNames,
    });
    expect(s.competition.totalEvents).toBe(0);
    expect(s.competition.byType).toEqual([]);
    expect(s.competition.rounds).toEqual([]);
    expect(s.competition.mostKata).toBeNull();
    expect(s.repertoire).toEqual([]);
    expect(s.goals).toBeNull();
    expect(s.focusPoints).toEqual([]);
  });
});
