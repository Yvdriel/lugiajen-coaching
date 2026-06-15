import { describe, expect, it } from "vitest";
import type { FeedbackRow } from "@/lib/queries/feedback";
import { nl } from "@/messages/nl";
import { feedbackSections } from "./feedback-sections";

function form(overrides: Partial<FeedbackRow>): FeedbackRow {
  // Start from all-null content; tests set only what they assert on.
  return {
    formType: "U16",
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
  it("U12 picks fun/show-parents, never the U16 self-ratings", () => {
    const sections = feedbackSections(
      form({
        formType: "U12",
        athleteFunScore: 4,
        athleteShowParents: "Mijn kata",
        selfRatingTraining: 5, // present in data but must be ignored for U12
      }),
    );
    const sideA = sections.find((s) => s.title === nl.feedback.sideA);
    expect(sideA).toBeTruthy();
    expect(labels(sideA!)).toContain(nl.feedback.fields.athleteFunScore);
    expect(labels(sideA!)).toContain(nl.feedback.fields.athleteShowParents);
    expect(labels(sideA!)).not.toContain(nl.feedback.fields.selfRatingTraining);
  });

  it("U16 picks self-ratings + performance/outcome/kata-focus goals", () => {
    const sections = feedbackSections(
      form({
        formType: "U16",
        selfRatingTraining: 5,
        athleteFunScore: 3, // present but must be ignored for U16
        goalMain: "Procesdoel",
        goalPerformance: "Top 3",
        kataFocus: "Kanku Dai",
      }),
    );
    const sideA = sections.find((s) => s.title === nl.feedback.sideA)!;
    expect(labels(sideA)).toContain(nl.feedback.fields.selfRatingTraining);
    expect(labels(sideA)).not.toContain(nl.feedback.fields.athleteFunScore);

    const goals = sections.find((s) => s.title === nl.feedback.goals)!;
    expect(labels(goals)).toEqual([
      nl.feedback.fields.goalMainProcess,
      nl.feedback.fields.goalPerformance,
      nl.feedback.fields.kataFocus,
    ]);
  });

  it("drops empty fields and fully-empty sections", () => {
    const sections = feedbackSections(
      form({ formType: "U12", coachStrength: "Goede focus" }),
    );
    // Only Side B has content → it's the only section.
    expect(sections.map((s) => s.title)).toEqual([nl.feedback.sideB]);
    expect(sections[0].fields).toHaveLength(1);
  });

  it("returns no sections for a blank form", () => {
    expect(feedbackSections(form({}))).toEqual([]);
  });
});
