import type { ScoringCardRow } from "@/lib/queries/scoring";
import type { LearningRow, SessionRow } from "@/lib/queries/training";
import { isSessionDone, sessionVli } from "./vli";

// Pure merge of everything that happened to one athlete, newest first. Feeds
// "what happened since the last gesprek" without five separate reads.

export type TimelineEvent =
  | {
      kind: "session";
      date: string;
      id: string;
      title: string | null;
      status: "done" | "skipped" | "planned";
      volume: number;
      load: number;
      intensity: number | null;
      kata: string[];
    }
  | {
      kind: "competition";
      date: string;
      id: string;
      name: string;
      category: string;
      placement: number | null;
      roundReached: string | null;
      lesson: string | null;
    }
  | {
      kind: "scoring_card";
      date: string;
      id: string;
      kataName: string;
      overallImpression: number;
      priorityImprovements: string | null;
    }
  | {
      kind: "feedback";
      date: string;
      id: string;
      formType: string;
      coachDevelopmentArea: string | null;
    }
  | {
      kind: "learning";
      date: string;
      id: string;
      body: string;
      tags: string[];
      author: "coach" | "ai";
    };

export function buildTimeline(args: {
  sessions: SessionRow[];
  competitions: {
    id: string;
    date: string;
    name: string;
    category: string;
    placement: number | null;
    roundReached: string | null;
    lesson: string | null;
  }[];
  cards: (ScoringCardRow & { kataName: string })[];
  feedback: {
    id: string;
    meetingDate: string;
    formType: string;
    coachDevelopmentArea: string | null;
  }[];
  learnings: LearningRow[];
  today: string;
  from: string;
  to: string;
}): TimelineEvent[] {
  const inRange = (d: string) => d >= args.from && d <= args.to;
  const out: TimelineEvent[] = [];

  for (const s of args.sessions) {
    if (!inRange(s.date)) continue;
    const v = sessionVli(s.blocks);
    out.push({
      kind: "session",
      date: s.date,
      id: s.id,
      title: s.title,
      status: s.skippedAt
        ? "skipped"
        : isSessionDone(s, args.today)
          ? "done"
          : "planned",
      volume: v.volume,
      load: v.load,
      intensity: v.intensity,
      kata: [
        ...new Set(s.blocks.map((b) => b.kataName).filter(Boolean)),
      ] as string[],
    });
  }
  for (const c of args.competitions) {
    if (inRange(c.date)) out.push({ kind: "competition", ...c });
  }
  for (const c of args.cards) {
    if (!inRange(c.assessmentDate)) continue;
    out.push({
      kind: "scoring_card",
      date: c.assessmentDate,
      id: c.id,
      kataName: c.kataName,
      overallImpression: c.overallImpression,
      priorityImprovements: c.priorityImprovements,
    });
  }
  for (const f of args.feedback) {
    if (!inRange(f.meetingDate)) continue;
    out.push({
      kind: "feedback",
      date: f.meetingDate,
      id: f.id,
      formType: f.formType,
      coachDevelopmentArea: f.coachDevelopmentArea,
    });
  }
  for (const l of args.learnings) {
    const date = l.createdAt.toISOString().slice(0, 10);
    if (!inRange(date)) continue;
    out.push({
      kind: "learning",
      date,
      id: l.id,
      body: l.body,
      tags: l.tags,
      author: l.author,
    });
  }
  return out.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}
