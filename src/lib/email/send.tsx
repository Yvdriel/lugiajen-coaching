import { user } from "@/db/schema";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { nl } from "@/messages/nl";
import { EMAIL_FROM, resend } from "./client";
import { CoachSubmittedEmail } from "./templates/coach-submitted";
import { ConsentRequestEmail } from "./templates/consent-request";
import { PrepareInviteEmail } from "./templates/prepare-invite";

export type SendResult = { ok: boolean; error?: string };

const NOT_CONFIGURED: SendResult = { ok: false, error: "email-not-configured" };

/** Absolute origin for links inside emails (no request context in cron). */
function baseUrl(): string {
  return env.BETTER_AUTH_URL.replace(/\/$/, "");
}

/** UTC day stamp — scopes idempotency keys so one nudge per form per day. */
function dayStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Coach account emails (single/few coaches) — recipients of internal notices. */
async function coachEmails(): Promise<string[]> {
  const rows = await db.select({ email: user.email }).from(user);
  return rows.map((r) => r.email).filter(Boolean);
}

/** Send (or re-send) the prepare-link invite to the athlete's contact email. */
export async function sendPrepareInvite(opts: {
  to: string;
  athleteName: string;
  prepareToken: string;
  meetingNumber: number;
  formId: string;
  isReminder?: boolean;
}): Promise<SendResult> {
  if (!resend) return NOT_CONFIGURED;
  const link = `${baseUrl()}/feedback/prepare/${opts.prepareToken}`;
  const t = nl.email.prepareInvite;
  const { error } = await resend.emails.send(
    {
      from: EMAIL_FROM,
      to: [opts.to],
      subject: opts.isReminder ? t.reminderSubject : t.subject,
      react: (
        <PrepareInviteEmail
          athleteName={opts.athleteName}
          link={link}
          meetingNumber={opts.meetingNumber}
          isReminder={!!opts.isReminder}
        />
      ),
    },
    {
      idempotencyKey: `prepare-invite/${opts.formId}/${
        opts.isReminder ? "rem" : "new"
      }/${dayStamp()}`,
    },
  );
  return error ? { ok: false, error: error.message } : { ok: true };
}

/** Send a parental-consent request link to the athlete's contact email. */
export async function sendConsentRequest(opts: {
  to: string;
  athleteName: string;
  token: string;
}): Promise<SendResult> {
  if (!resend) return NOT_CONFIGURED;
  const link = `${baseUrl()}/consent/${opts.token}`;
  const t = nl.consent.email;
  const { error } = await resend.emails.send(
    {
      from: EMAIL_FROM,
      to: [opts.to],
      subject: t.subject,
      react: (
        <ConsentRequestEmail athleteName={opts.athleteName} link={link} />
      ),
    },
    { idempotencyKey: `consent-request/${opts.token}` },
  );
  return error ? { ok: false, error: error.message } : { ok: true };
}

/** Notify the coach(es) that an athlete submitted their prepare form. */
export async function sendCoachSubmittedNotice(opts: {
  athleteId: string;
  athleteName: string;
  feedbackId: string;
  meetingNumber: number;
}): Promise<SendResult> {
  if (!resend) return NOT_CONFIGURED;
  const to = await coachEmails();
  if (to.length === 0) return { ok: false, error: "no-coach" };
  const link = `${baseUrl()}/athletes/${opts.athleteId}/feedback/${opts.feedbackId}`;
  const t = nl.email.coachSubmitted;
  const { error } = await resend.emails.send(
    {
      from: EMAIL_FROM,
      to,
      subject: t.subject,
      react: (
        <CoachSubmittedEmail
          athleteName={opts.athleteName}
          link={link}
          meetingNumber={opts.meetingNumber}
        />
      ),
    },
    { idempotencyKey: `submit-notice/${opts.feedbackId}` },
  );
  return error ? { ok: false, error: error.message } : { ok: true };
}
