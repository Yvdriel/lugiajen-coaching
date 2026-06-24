import { and, eq, isNull } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import {
  feedbackActionItems,
  feedbackGoals,
  feedbackKataRatings,
} from "@/db/schema";
import { db } from "@/lib/db";
import type { FeedbackActionRow, FeedbackGoalRow } from "@/lib/queries/feedback";
import {
  ACTION_COUNT_FIELD,
  actionKataField,
  actionTextField,
  type GoalCategory,
  GOAL_FORM_FIELDS,
  type KataRatingInput,
  prepActionDispField,
  prepActionReasonField,
  prepGoalDispField,
  prepGoalReasonField,
  reviewActionCarryField,
  reviewActionDispField,
  reviewActionNoteField,
  reviewGoalCarryTextField,
  reviewGoalDispField,
  reviewGoalMomentumField,
  reviewGoalReasonField,
} from "./schema";

// Goals + action items are first-class rows (promoted from columns). This module
// owns parsing, server-side review validation, and the batch-statement builder the
// coach actions run atomically. Wire-format field names live in ./schema (client-safe).

type Stmt = BatchItem<"pg">;

// Hardcoded Dutch validation messages (matching the existing actions.ts convention).
const REASON_REQUIRED = "Geef een reden op.";
const MOMENTUM_REQUIRED = "Kies vooruitgang of stilstand.";

function fdString(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v.trim() : "";
}

// ── Parsing ───────────────────────────────────────────────────────────────────
export type ActionItemInput = {
  text: string;
  kataId: string | null;
  sortOrder: number;
};

/** Parse the dynamic action list; drop empty-text rows; validate kata ∈ repertoire. */
export function parseActionItems(
  formData: FormData,
  repertoireKataIds: ReadonlySet<string>,
): ActionItemInput[] {
  const count = Number(formData.get(ACTION_COUNT_FIELD) ?? 0);
  const max = Number.isFinite(count) ? Math.min(count, 100) : 0;
  const out: ActionItemInput[] = [];
  for (let n = 0; n < max; n++) {
    const text = fdString(formData, actionTextField(n));
    if (!text) continue;
    const rawKata = fdString(formData, actionKataField(n));
    const kataId = repertoireKataIds.has(rawKata) ? rawKata : null;
    out.push({ text, kataId, sortOrder: out.length });
  }
  return out;
}

export type GoalInput = { category: GoalCategory; text: string; sortOrder: number };

/** Parse goals from the 4 template inputs; drop empties, keep slot order. */
export function parseGoals(formData: FormData): GoalInput[] {
  const out: GoalInput[] = [];
  for (const { name, category } of GOAL_FORM_FIELDS) {
    const text = fdString(formData, name);
    if (!text) continue;
    out.push({ category, text, sortOrder: out.length });
  }
  return out;
}

// ── Review validation (coach) ─────────────────────────────────────────────────
/**
 * Forced-reason rules: dropped goal → reason; carried goal → momentum, and a reason
 * when stalled. Returns field-keyed errors (empty = valid).
 */
export function validateCoachReview(
  formData: FormData,
  prevGoals: FeedbackGoalRow[],
): Record<string, string> {
  const errs: Record<string, string> = {};
  for (const g of prevGoals) {
    const disp = fdString(formData, reviewGoalDispField(g.id));
    const reason = fdString(formData, reviewGoalReasonField(g.id));
    if (disp === "dropped" && !reason) {
      errs[reviewGoalReasonField(g.id)] = REASON_REQUIRED;
    } else if (disp === "carried") {
      const momentum = fdString(formData, reviewGoalMomentumField(g.id));
      if (momentum !== "progressing" && momentum !== "stalled") {
        errs[reviewGoalMomentumField(g.id)] = MOMENTUM_REQUIRED;
      } else if (momentum === "stalled" && !reason) {
        errs[reviewGoalReasonField(g.id)] = REASON_REQUIRED;
      }
    }
  }
  return errs;
}

// ── Review validation (athlete / prepare) ─────────────────────────────────────
/** Athlete self-disposition: a reason is required whenever the item is not `done`. */
export function validateAthleteReview(
  formData: FormData,
  prevGoals: FeedbackGoalRow[],
  prevActions: FeedbackActionRow[],
): Record<string, string> {
  const errs: Record<string, string> = {};
  for (const g of prevGoals) {
    const disp = fdString(formData, prepGoalDispField(g.id));
    if ((disp === "partly" || disp === "not_done") && !fdString(formData, prepGoalReasonField(g.id))) {
      errs[prepGoalReasonField(g.id)] = REASON_REQUIRED;
    }
  }
  for (const a of prevActions) {
    const disp = fdString(formData, prepActionDispField(a.id));
    if ((disp === "partly" || disp === "not_done") && !fdString(formData, prepActionReasonField(a.id))) {
      errs[prepActionReasonField(a.id)] = REASON_REQUIRED;
    }
  }
  return errs;
}

// ── Batch builders ────────────────────────────────────────────────────────────
type BuildArgs = {
  feedbackId: string;
  goals: GoalInput[];
  actions: ActionItemInput[];
  ratings: KataRatingInput[];
  prevGoals: FeedbackGoalRow[];
  prevActions: FeedbackActionRow[];
  formData: FormData;
};

/**
 * All child writes for one coach save, as ordered db.batch statements:
 * replace the form's own (non-carried) goals/actions/kata-ratings, then apply the
 * review dispositions to the previous meeting's rows and spawn carried rows.
 * Carried inserts are idempotent (onConflictDoNothing on the carry unique index).
 */
export function buildCoachChildStatements({
  feedbackId,
  goals,
  actions,
  ratings,
  prevGoals,
  prevActions,
  formData,
}: BuildArgs): Stmt[] {
  const stmts: Stmt[] = [];

  // Replace this meeting's own goals (carried rows survive — they're spawned below).
  stmts.push(
    db
      .delete(feedbackGoals)
      .where(
        and(
          eq(feedbackGoals.feedbackId, feedbackId),
          isNull(feedbackGoals.carriedFromGoalId),
        ),
      ),
  );
  if (goals.length > 0) {
    stmts.push(
      db
        .insert(feedbackGoals)
        .values(goals.map((g) => ({ ...g, feedbackId, status: "active" as const }))),
    );
  }

  // Replace this meeting's own action items.
  stmts.push(
    db
      .delete(feedbackActionItems)
      .where(
        and(
          eq(feedbackActionItems.feedbackId, feedbackId),
          isNull(feedbackActionItems.carriedFromActionId),
        ),
      ),
  );
  if (actions.length > 0) {
    stmts.push(
      db
        .insert(feedbackActionItems)
        .values(actions.map((a) => ({ ...a, feedbackId }))),
    );
  }

  // Replace the kata self-ratings (append-free; full set posted).
  stmts.push(
    db.delete(feedbackKataRatings).where(eq(feedbackKataRatings.feedbackId, feedbackId)),
  );
  if (ratings.length > 0) {
    stmts.push(
      db.insert(feedbackKataRatings).values(ratings.map((r) => ({ ...r, feedbackId }))),
    );
  }

  // Goal review: authoritative disposition on each prior goal (+ spawn carried).
  for (const g of prevGoals) {
    const disp = fdString(formData, reviewGoalDispField(g.id));
    if (disp !== "achieved" && disp !== "carried" && disp !== "dropped") continue;
    const reason = fdString(formData, reviewGoalReasonField(g.id)) || null;
    if (disp === "achieved") {
      stmts.push(
        db
          .update(feedbackGoals)
          .set({ status: "achieved", reviewedAtMeetingId: feedbackId })
          .where(eq(feedbackGoals.id, g.id)),
      );
    } else if (disp === "dropped") {
      stmts.push(
        db
          .update(feedbackGoals)
          .set({ status: "dropped", coachReason: reason, reviewedAtMeetingId: feedbackId })
          .where(eq(feedbackGoals.id, g.id)),
      );
    } else {
      const momentum = fdString(formData, reviewGoalMomentumField(g.id));
      const m = momentum === "stalled" ? "stalled" : "progressing";
      stmts.push(
        db
          .update(feedbackGoals)
          .set({
            status: "carried",
            momentum: m,
            coachReason: reason,
            reviewedAtMeetingId: feedbackId,
          })
          .where(eq(feedbackGoals.id, g.id)),
      );
      const carryText = fdString(formData, reviewGoalCarryTextField(g.id)) || g.text;
      stmts.push(
        db
          .insert(feedbackGoals)
          .values({
            feedbackId,
            category: g.category,
            text: carryText,
            status: "active",
            carriedFromGoalId: g.id,
            sortOrder: g.sortOrder,
          })
          .onConflictDoNothing(),
      );
    }
  }

  // Action review: coach disposition + optional carry of each prior pending action.
  for (const a of prevActions) {
    const disp = fdString(formData, reviewActionDispField(a.id));
    if (disp !== "done" && disp !== "partly" && disp !== "not_done") continue;
    const note = fdString(formData, reviewActionNoteField(a.id)) || null;
    stmts.push(
      db
        .update(feedbackActionItems)
        .set({ coachDisposition: disp, coachNote: note, reviewedAtMeetingId: feedbackId })
        .where(eq(feedbackActionItems.id, a.id)),
    );
    const carry = fdString(formData, reviewActionCarryField(a.id));
    if (disp !== "done" && (carry === "on" || carry === "true")) {
      stmts.push(
        db
          .insert(feedbackActionItems)
          .values({
            feedbackId,
            text: a.text,
            kataId: a.kataId,
            carriedFromActionId: a.id,
            coachDisposition: "pending",
            sortOrder: 1000 + a.sortOrder, // carried rows sort after fresh ones
          })
          .onConflictDoNothing(),
      );
    }
  }

  return stmts;
}

/**
 * Athlete self-disposition writes (prepare flow). Writes ONLY athlete* columns onto
 * the PREVIOUS meeting's rows — the public boundary. Each update is scoped to the
 * row id AND its open state so an athlete can't touch an already-reviewed row.
 */
export function buildAthleteReviewStatements(
  formData: FormData,
  prevGoals: FeedbackGoalRow[],
  prevActions: FeedbackActionRow[],
): Stmt[] {
  const stmts: Stmt[] = [];
  for (const g of prevGoals) {
    const disp = fdString(formData, prepGoalDispField(g.id));
    if (disp !== "done" && disp !== "partly" && disp !== "not_done") continue;
    const reason = fdString(formData, prepGoalReasonField(g.id)) || null;
    stmts.push(
      db
        .update(feedbackGoals)
        .set({ athleteDisposition: disp, athleteReason: reason })
        .where(
          and(
            eq(feedbackGoals.id, g.id),
            eq(feedbackGoals.feedbackId, g.feedbackId),
            eq(feedbackGoals.status, "active"),
            isNull(feedbackGoals.reviewedAtMeetingId),
          ),
        ),
    );
  }
  for (const a of prevActions) {
    const disp = fdString(formData, prepActionDispField(a.id));
    if (disp !== "done" && disp !== "partly" && disp !== "not_done") continue;
    const reason = fdString(formData, prepActionReasonField(a.id)) || null;
    stmts.push(
      db
        .update(feedbackActionItems)
        .set({ athleteDisposition: disp, athleteReason: reason })
        .where(
          and(
            eq(feedbackActionItems.id, a.id),
            eq(feedbackActionItems.feedbackId, a.feedbackId),
            eq(feedbackActionItems.coachDisposition, "pending"),
          ),
        ),
    );
  }
  return stmts;
}
