import { and, eq, gte, sql } from "drizzle-orm";
import { athletes, feedbackForms } from "@/db/schema";
import { resolveRecipient } from "@/features/athletes/consent";
import { db } from "@/lib/db";
import { sendPrepareInvite } from "@/lib/email/send";
import { env } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Days an awaiting_athlete form must sit (since last nudge, or creation) before the
// cron re-sends. Idempotency keys in sendPrepareInvite add a per-day backstop.
const REMINDER_AFTER_DAYS = 3;

/**
 * Daily Vercel cron: nudge athletes who still haven't submitted their prepare form.
 * Guarded by CRON_SECRET. Skips consent-blocked / no-email athletes (resolveRecipient)
 * and forms whose meeting date has already passed.
 */
export async function GET(req: Request): Promise<Response> {
  const authHeader = req.headers.get("authorization");
  if (!env.CRON_SECRET || authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const threshold = new Date(
    now.getTime() - REMINDER_AFTER_DAYS * 24 * 60 * 60 * 1000,
  );

  const rows = await db
    .select({
      formId: feedbackForms.id,
      prepareToken: feedbackForms.prepareToken,
      meetingNumber: feedbackForms.meetingNumber,
      firstName: athletes.firstName,
      dateOfBirth: athletes.dateOfBirth,
      contactEmail: athletes.contactEmail,
      parentalConsentAt: athletes.parentalConsentAt,
    })
    .from(feedbackForms)
    .innerJoin(athletes, eq(feedbackForms.athleteId, athletes.id))
    .where(
      and(
        eq(feedbackForms.status, "awaiting_athlete"),
        gte(feedbackForms.meetingDate, today),
        sql`coalesce(${feedbackForms.lastReminderAt}, ${feedbackForms.createdAt}) < ${threshold}`,
      ),
    );

  let sent = 0;
  let skipped = 0;
  for (const row of rows) {
    if (!row.prepareToken) {
      skipped++;
      continue;
    }
    const recipient = resolveRecipient(row, now);
    if (!recipient.ok) {
      skipped++;
      continue;
    }
    const res = await sendPrepareInvite({
      to: recipient.email,
      athleteName: row.firstName,
      prepareToken: row.prepareToken,
      meetingNumber: row.meetingNumber,
      formId: row.formId,
      isReminder: true,
    });
    if (!res.ok) {
      skipped++;
      continue;
    }
    await db
      .update(feedbackForms)
      .set({ lastReminderAt: now })
      .where(eq(feedbackForms.id, row.formId));
    sent++;
  }

  return Response.json({ sent, skipped, candidates: rows.length });
}
