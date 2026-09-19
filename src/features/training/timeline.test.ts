import { describe, expect, it } from "vitest";
import type { LearningRow, SessionRow } from "@/lib/queries/training";
import { buildTimeline } from "./timeline";

describe("buildTimeline", () => {
  it("merges all kinds, filters by range, newest first", () => {
    const out = buildTimeline({
      sessions: [
        {
          id: "s1",
          date: "2026-09-10",
          title: null,
          skippedAt: null,
          blocks: [
            {
              kataId: "k",
              kataName: "Enpi",
              split: "third",
              sections: [1, 2, 3],
              reps: 2,
              restRepSec: 30,
              restSectionSec: 60,
              rounds: 1,
              minutes: null,
              skipped: false,
              actualReps: null,
            },
          ],
        } as unknown as SessionRow,
        {
          id: "s2",
          date: "2026-08-01",
          skippedAt: null,
          blocks: [],
        } as unknown as SessionRow,
      ],
      competitions: [
        {
          id: "c1",
          date: "2026-09-12",
          name: "Open",
          category: "U21",
          placement: 2,
          roundReached: null,
          lesson: null,
        },
      ],
      cards: [],
      feedback: [
        {
          id: "f1",
          meetingDate: "2026-09-05",
          formType: "SENIOR",
          coachDevelopmentArea: null,
        },
      ],
      learnings: [
        {
          id: "l1",
          body: "x",
          tags: [],
          author: "ai",
          createdAt: new Date("2026-09-11T10:00:00Z"),
        } as unknown as LearningRow,
      ],
      today: "2026-09-20",
      from: "2026-09-01",
      to: "2026-09-30",
    });
    expect(out.map((e) => `${e.kind}:${e.date}`)).toEqual([
      "competition:2026-09-12",
      "learning:2026-09-11",
      "session:2026-09-10",
      "feedback:2026-09-05",
    ]);
    const s = out[2];
    expect(s.kind === "session" && s.status).toBe("done");
    expect(s.kind === "session" && s.load).toBe(2);
    expect(s.kind === "session" && s.kata).toEqual(["Enpi"]);
  });
});
