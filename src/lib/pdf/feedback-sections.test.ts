import { describe, expect, it } from "vitest";
import type {
  FeedbackActionRow,
  FeedbackGoalRow,
  FeedbackKataRatingRow,
  FeedbackRow,
} from "@/lib/queries/feedback";
import { nl } from "@/messages/nl";
import { feedbackSections } from "./feedback-sections";

function form(overrides: Partial<FeedbackRow>): FeedbackRow {
  // Start from all-null content; tests set only what they assert on. Fields not
  // listed here read as undefined and are dropped by `clean`, same as null.
  return {
    formType: "CADET",
    meetingNumber: 1,
    meetingDate: "2026-01-01",
    season: "2026/2027",
    athleteProudOf: null,
    athleteHardestThing: null,
    athleteShowParents: null,
    athleteFunScore: null,
    athleteMakeMoreFun: null,
    athleteQuestion: null,
    selfRatingTraining: null,
    selfRatingMotivation: null,
    selfRatingBody: null,
    selfRatingCompetition: null,
    athleteNeedsWork: null,
    coachStrength: null,
    coachDevelopmentArea: null,
    periodizationNotes: null,
    physicalPlan: null,
    ...overrides,
  } as unknown as FeedbackRow;
}

// Goals + action items are rows now (not columns); tests build the rows directly.
function goal(
  category: FeedbackGoalRow["category"],
  text: string,
  overrides: Partial<FeedbackGoalRow> = {},
): FeedbackGoalRow {
  return {
    category,
    text,
    status: "active",
    momentum: null,
    coachReason: null,
    athleteDisposition: null,
    athleteReason: null,
    carriedFromGoalId: null,
    reviewedAtMeetingId: null,
    sortOrder: 0,
    ...overrides,
  } as unknown as FeedbackGoalRow;
}

function action(
  text: string,
  kataName: string | null = null,
  overrides: Partial<FeedbackActionRow> = {},
): FeedbackActionRow {
  return {
    text,
    kataId: kataName ? "k" : null,
    kataName,
    coachDisposition: "pending",
    coachNote: null,
    athleteDisposition: null,
    athleteReason: null,
    carriedFromActionId: null,
    reviewedAtMeetingId: null,
    sortOrder: 0,
    ...overrides,
  } as unknown as FeedbackActionRow;
}

const labels = (s: ReturnType<typeof feedbackSections>[number]) =>
  s.fields.map((f) => f.label);

describe("feedbackSections", () => {
  it("U12 labels the single goal as goalMain (not the process goal)", () => {
    const sections = feedbackSections(
      form({
        formType: "U12",
        athleteFunScore: 4,
        athleteShowParents: "Mijn kata",
      }),
      nl,
      [],
      [goal("main", "Mooie zenkutsu")],
    );
    const sideA = sections.find((s) => s.title === nl.feedback.sideA);
    expect(labels(sideA!)).toContain(nl.feedback.fields.athleteFunScore);
    expect(labels(sideA!)).toContain(nl.feedback.fields.athleteShowParents);

    const goals = sections.find((s) => s.title === nl.feedback.goals)!;
    expect(labels(goals)).toContain(nl.feedback.fields.goalMain);
    expect(labels(goals)).not.toContain(nl.feedback.fields.goalMainProcess);
  });

  it("CADET shows self-ratings + the three-tier goals (process label)", () => {
    const sections = feedbackSections(
      form({ formType: "CADET", selfRatingTraining: 5 }),
      nl,
      [],
      [
        goal("main", "Procesdoel"),
        goal("performance", "Top 3"),
        goal("kata_focus", "Kanku Dai"),
      ],
    );
    const sideA = sections.find((s) => s.title === nl.feedback.sideA)!;
    expect(labels(sideA)).toContain(nl.feedback.fields.selfRatingTraining);

    const goals = sections.find((s) => s.title === nl.feedback.goals)!;
    expect(labels(goals)).toEqual([
      nl.feedback.fields.goalMainProcess,
      nl.feedback.fields.goalPerformance,
      nl.feedback.fields.kataFocus,
    ]);
  });

  it("SENIOR surfaces senior-only fields, the physical plan, and kata-tagged actions", () => {
    const sections = feedbackSections(
      form({
        formType: "SENIOR",
        selfRatingRecovery: 3,
        physicalStateNotes: "Lichte knieklacht",
        physicalPlan: "2x mobiliteit per week",
      }),
      nl,
      [],
      [],
      [action("Slaaplog bijhouden"), action("Hogere sprong", "Unsu")],
    );
    const sideA = sections.find((s) => s.title === nl.feedback.sideA)!;
    expect(labels(sideA)).toContain(nl.feedback.fields.selfRatingRecovery);
    expect(labels(sideA)).toContain(nl.feedback.fields.physicalStateNotes);

    const goals = sections.find((s) => s.title === nl.feedback.goals)!;
    expect(labels(goals)).toContain(nl.feedback.fields.physicalPlan);

    const actions = sections.find((s) => s.title === nl.feedback.actionItems)!;
    // Actions are labelled by kata (general first), values carry the text.
    expect(labels(actions)).toEqual([nl.feedback.actions.general, "Unsu"]);
    expect(actions.fields.map((f) => f.value)).toContain("Slaaplog bijhouden");
  });

  it("includes a kata self-rating section when ratings are passed", () => {
    const ratings: FeedbackKataRatingRow[] = [
      { kataId: "k1", kataName: "Unsu", score: 7, notes: "Sprong hoger" },
      { kataId: "k2", kataName: "Sochin", score: null, notes: "Stabiel" },
    ];
    const sections = feedbackSections(form({ formType: "CADET" }), nl, ratings);
    const kata = sections.find((s) => s.title === nl.feedback.kataSelfRating)!;
    expect(kata).toBeTruthy();
    expect(labels(kata)).toEqual(["Unsu", "Sochin"]);
    expect(kata.fields[0].value).toContain("7/10");
  });

  it("drops empty fields and fully-empty sections", () => {
    const sections = feedbackSections(
      form({ formType: "U12", coachStrength: "Goede focus" }),
      nl,
    );
    expect(sections.map((s) => s.title)).toEqual([nl.feedback.sideB]);
    expect(sections[0].fields).toHaveLength(1);
  });

  it("returns no sections for a blank form", () => {
    expect(feedbackSections(form({}), nl)).toEqual([]);
  });
});
