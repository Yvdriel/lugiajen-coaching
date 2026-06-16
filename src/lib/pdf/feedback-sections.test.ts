import { describe, expect, it } from "vitest";
import type {
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
    goalMain: null,
    goalPerformance: null,
    goalOutcome: null,
    kataFocus: null,
    action1: null,
    action2: null,
    action3: null,
    ...overrides,
  } as unknown as FeedbackRow;
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
        goalMain: "Mooie zenkutsu",
      }),
      nl,
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
      form({
        formType: "CADET",
        selfRatingTraining: 5,
        goalMain: "Procesdoel",
        goalPerformance: "Top 3",
        kataFocus: "Kanku Dai",
      }),
      nl,
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

  it("SENIOR surfaces senior-only fields + the 4th action", () => {
    const sections = feedbackSections(
      form({
        formType: "SENIOR",
        selfRatingRecovery: 3,
        physicalStateNotes: "Lichte knieklacht",
        physicalPlan: "2x mobiliteit per week",
        action4: "Slaaplog bijhouden",
      }),
      nl,
    );
    const sideA = sections.find((s) => s.title === nl.feedback.sideA)!;
    expect(labels(sideA)).toContain(nl.feedback.fields.selfRatingRecovery);
    expect(labels(sideA)).toContain(nl.feedback.fields.physicalStateNotes);

    const goals = sections.find((s) => s.title === nl.feedback.goals)!;
    expect(labels(goals)).toContain(nl.feedback.fields.physicalPlan);

    const actions = sections.find((s) => s.title === nl.feedback.actionItems)!;
    expect(labels(actions)).toContain(nl.feedback.fields.action4);
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
