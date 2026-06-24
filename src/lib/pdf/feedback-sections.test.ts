import { describe, expect, it } from "vitest";
import type { MeetingCompetition } from "@/lib/queries/competition-reflections";
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

// ── Competition section (CADET+) ───────────────────────────────────────────────
function entry(overrides: Record<string, unknown>) {
  return {
    id: "e",
    category: "Cadet -57kg",
    feedbackBefore: null,
    feedbackPerformance: null,
    feedbackImprovement: null,
    feedbackLesson: null,
    ...overrides,
  } as unknown as MeetingCompetition["entries"][number];
}

function meetingComp(
  overrides: Partial<MeetingCompetition> = {},
): MeetingCompetition {
  return {
    competitionId: "c1",
    competitionName: "Hayashi Cup",
    competitionDate: "2026-03-01",
    competitionType: "international",
    categories: ["Cadet -57kg"],
    entries: [entry({})],
    reflection: null,
    ...overrides,
  };
}

const cs = nl.feedback.competitionSection;
const ce = nl.competition.entry;

describe("feedbackSections — competition section", () => {
  it("pairs the athlete reflection with the coach feedback per dimension", () => {
    const sections = feedbackSections(
      form({ formType: "CADET" }),
      nl,
      [],
      [],
      [],
      [
        meetingComp({
          entries: [entry({ feedbackPerformance: "Strakke kime" })],
          reflection: {
            overallRating: 3,
            reflectionPerformance: "Ging soepel",
          } as unknown as MeetingCompetition["reflection"],
        }),
      ],
    );
    const sec = sections.find(
      (s) => s.title === `${cs.heading} — Hayashi Cup`,
    )!;
    expect(sec).toBeTruthy();
    // rating rendered as n/5
    expect(sec.fields.find((f) => f.label === cs.rating)?.value).toBe("3/5");
    // the performance dimension carries both reads
    const perf = sec.fields.find((f) => f.label === ce.feedbackPerformance)!;
    expect(perf.value).toContain(`${cs.athleteColumn}: Ging soepel`);
    expect(perf.value).toContain(`${cs.coachColumn}: Strakke kime`);
  });

  it("tags each coach line with its category when there are two entries", () => {
    const sections = feedbackSections(
      form({ formType: "JUNIOR" }),
      nl,
      [],
      [],
      [],
      [
        meetingComp({
          categories: ["Junior", "U21"],
          entries: [
            entry({ category: "Junior", feedbackLesson: "Rust bewaren" }),
            entry({ category: "U21", feedbackLesson: "Tempo hoog houden" }),
          ],
          reflection: null,
        }),
      ],
    );
    const sec = sections.find(
      (s) => s.title === `${cs.heading} — Hayashi Cup`,
    )!;
    const lesson = sec.fields.find((f) => f.label === ce.feedbackLesson)!;
    expect(lesson.value).toContain(`${cs.coachColumn} (Junior): Rust bewaren`);
    expect(lesson.value).toContain(`${cs.coachColumn} (U21): Tempo hoog houden`);
    // no reflection → no athlete line, no rating field
    expect(lesson.value).not.toContain(cs.athleteColumn);
    expect(sec.fields.some((f) => f.label === cs.rating)).toBe(false);
  });

  it("omits the competition section entirely when none are passed", () => {
    const sections = feedbackSections(
      form({ formType: "CADET", coachStrength: "x" }),
      nl,
    );
    expect(
      sections.some((s) => s.title.startsWith(cs.heading)),
    ).toBe(false);
  });
});
