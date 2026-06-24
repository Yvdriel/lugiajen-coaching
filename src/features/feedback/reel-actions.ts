"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { clips, feedbackClips, feedbackForms } from "@/db/schema";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { nl } from "@/messages/nl";
import { reorderSortValues } from "./reel-order";

// Coach-only reel curation on a parent-meeting feedback gesprek. The clip bytes
// never pass through here — these actions only link existing clips (uploaded
// straight to Cloudflare in Session 2) onto a form and order them.

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ReelActionState = { ok: boolean; message?: string };

// Every mutating action re-checks the session itself (convention 2).
async function requireSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
}

async function loadForm(feedbackId: string) {
  const [form] = await db
    .select({
      id: feedbackForms.id,
      athleteId: feedbackForms.athleteId,
      status: feedbackForms.status,
    })
    .from(feedbackForms)
    .where(eq(feedbackForms.id, feedbackId));
  return form ?? null;
}

// A completed gesprek's reel is locked server-side, not just hidden in the UI —
// it's what parents see on the portal, so it must not change after the meeting.
const lockedState: ReelActionState = {
  ok: false,
  message: nl.feedback.reel.locked,
};

function revalidateReel(athleteId: string, feedbackId: string) {
  revalidatePath(`/athletes/${athleteId}/feedback/${feedbackId}`);
  revalidatePath(`/athletes/${athleteId}`);
}

/**
 * Attach a clip to the reel as the coach (`addedBy: coach`), appended at the end.
 * The clip must belong to the same athlete as the gesprek. Idempotent-friendly: a
 * duplicate is refused with a friendly message (the unique index also guards races).
 */
export async function attachClipToFeedback(
  feedbackId: string,
  clipId: string,
  caption?: string,
): Promise<ReelActionState> {
  await requireSession();
  if (!UUID_RE.test(feedbackId) || !UUID_RE.test(clipId)) {
    return { ok: false, message: "Onbekend gesprek." };
  }
  const form = await loadForm(feedbackId);
  if (!form) return { ok: false, message: "Onbekend gesprek." };
  if (form.status === "completed") return lockedState;

  const [clip] = await db
    .select({ athleteId: clips.athleteId })
    .from(clips)
    .where(eq(clips.id, clipId));
  if (!clip) return { ok: false, message: "Onbekende clip." };
  if (clip.athleteId !== form.athleteId) {
    return { ok: false, message: "Clip hoort niet bij deze atleet." };
  }

  const [existing] = await db
    .select({ id: feedbackClips.id })
    .from(feedbackClips)
    .where(
      and(
        eq(feedbackClips.feedbackId, feedbackId),
        eq(feedbackClips.clipId, clipId),
      ),
    );
  if (existing) return { ok: false, message: "Deze video staat al in de reel." };

  const [agg] = await db
    .select({ max: sql<number | null>`max(${feedbackClips.sortOrder})` })
    .from(feedbackClips)
    .where(eq(feedbackClips.feedbackId, feedbackId));

  await db.insert(feedbackClips).values({
    feedbackId,
    clipId,
    sortOrder: (agg?.max ?? -1) + 1,
    addedBy: "coach",
    caption: caption?.trim() || null,
  });

  revalidateReel(form.athleteId, feedbackId);
  return { ok: true };
}

/** Remove a clip from the reel (the clip itself is untouched). */
export async function detachFeedbackClip(
  feedbackClipId: string,
): Promise<ReelActionState> {
  await requireSession();
  if (!UUID_RE.test(feedbackClipId)) return { ok: false, message: "Onbekend item." };
  const [row] = await db
    .select({ feedbackId: feedbackClips.feedbackId })
    .from(feedbackClips)
    .where(eq(feedbackClips.id, feedbackClipId));
  if (!row) return { ok: true };
  const form = await loadForm(row.feedbackId);
  if (form?.status === "completed") return lockedState;

  await db.delete(feedbackClips).where(eq(feedbackClips.id, feedbackClipId));
  if (form) revalidateReel(form.athleteId, row.feedbackId);
  return { ok: true };
}

/** Set (or clear) a reel item's caption. */
export async function updateFeedbackClipCaption(
  feedbackClipId: string,
  caption: string,
): Promise<ReelActionState> {
  await requireSession();
  if (!UUID_RE.test(feedbackClipId)) return { ok: false, message: "Onbekend item." };
  const [row] = await db
    .select({ feedbackId: feedbackClips.feedbackId })
    .from(feedbackClips)
    .where(eq(feedbackClips.id, feedbackClipId));
  if (!row) return { ok: false, message: "Onbekend item." };
  const form = await loadForm(row.feedbackId);
  if (form?.status === "completed") return lockedState;

  await db
    .update(feedbackClips)
    .set({ caption: caption.trim() || null })
    .where(eq(feedbackClips.id, feedbackClipId));
  if (form) revalidateReel(form.athleteId, row.feedbackId);
  return { ok: true };
}

/**
 * Persist a new reel order. The full ordered set of this form's reel ids is posted;
 * sortOrder is recomputed by index and written atomically (db.batch, convention 1).
 * Bails if the posted set doesn't exactly match the form's current reel (stale UI).
 */
export async function reorderFeedbackClips(
  feedbackId: string,
  orderedFeedbackClipIds: string[],
): Promise<ReelActionState> {
  await requireSession();
  if (!UUID_RE.test(feedbackId)) return { ok: false, message: "Onbekend gesprek." };
  const form = await loadForm(feedbackId);
  if (!form) return { ok: false, message: "Onbekend gesprek." };
  if (form.status === "completed") return lockedState;

  const current = await db
    .select({ id: feedbackClips.id })
    .from(feedbackClips)
    .where(eq(feedbackClips.feedbackId, feedbackId));
  const valid = new Set(current.map((r) => r.id));
  const ids = orderedFeedbackClipIds.filter((id) => valid.has(id));
  if (ids.length !== valid.size) {
    return { ok: false, message: "Reel gewijzigd — vernieuw de pagina." };
  }

  const stmts = reorderSortValues(ids).map(({ id, sortOrder }) =>
    db
      .update(feedbackClips)
      .set({ sortOrder })
      .where(
        and(eq(feedbackClips.id, id), eq(feedbackClips.feedbackId, feedbackId)),
      ),
  );
  if (stmts.length > 0) {
    await db.batch(stmts as [(typeof stmts)[number], ...(typeof stmts)[number][]]);
  }

  revalidateReel(form.athleteId, feedbackId);
  return { ok: true };
}
