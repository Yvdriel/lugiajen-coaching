"use server";

import { and, eq, isNull, ne, sql } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { after } from "next/server";
import {
  competitionAthleteReflection,
  feedbackForms,
  feedbackKataRatings,
} from "@/db/schema";
import { resolveRecipient } from "@/features/athletes/consent";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendCoachSubmittedNotice, sendPrepareInvite } from "@/lib/email/send";
import { getAthleteById } from "@/lib/queries/athletes";
import { getMeetingCompetitionWindow } from "@/lib/queries/competition-reflections";
import {
  getFeedbackById,
  getOpenGoalsForReview,
  getPendingActionsForReview,
  getPreviousMeeting,
} from "@/lib/queries/feedback";
import { getAthleteKata } from "@/lib/queries/kata";
import { prepareRateLimiter } from "@/lib/rate-limit";
import { nl } from "@/messages/nl";
import {
  buildAthleteReviewStatements,
  buildCoachChildStatements,
  parseActionItems,
  parseGoals,
  validateAthleteReview,
  validateCoachReview,
} from "./children";
import {
  currentSeason,
  type FormType,
  isFormType,
  maxMeetingNumber,
  showsCompetitionSection,
} from "./form-type";
import {
  type AthletePrepParsed,
  athletePrepSchema,
  type CompetitionReflectionInput,
  FEEDBACK_ATHLETE_FIELDS,
  FEEDBACK_CONTENT_FIELDS,
  type FeedbackParsed,
  feedbackSchema,
  type KataRatingInput,
  parseCompetitionReflections,
  parseKataRatings,
} from "./schema";

type Stmt = BatchItem<"pg">;
type ReviewError = { fieldErrors: Record<string, string> };

/**
 * Shared coach-save gather: parse the dynamic goals/actions/ratings, re-derive the
 * previous meeting + its open items, validate the review, and build the child batch.
 * Returns either the statements to append to the parent write, or review field errors.
 */
async function gatherCoachChildren(
  athleteId: string,
  feedbackId: string,
  parsed: FeedbackParsed,
  formData: FormData,
  createdAt: Date,
): Promise<{ stmts: Stmt[] } | ReviewError> {
  const repertoire = await getAthleteKata(athleteId);
  const kataIds = new Set(repertoire.map((r) => r.kataId));
  const ratings = parseKataRatings(
    formData,
    repertoire.map((r) => r.kataId),
  );
  const goals = parseGoals(formData);
  const actions = parseActionItems(formData, kataIds);

  const prev = await getPreviousMeeting(athleteId, {
    id: feedbackId,
    meetingDate: parsed.meetingDate,
    createdAt,
  });
  const prevGoals = prev ? await getOpenGoalsForReview(prev.id) : [];
  const prevActions = prev ? await getPendingActionsForReview(prev.id) : [];

  const reviewErrors = validateCoachReview(formData, prevGoals);
  if (Object.keys(reviewErrors).length > 0) {
    return { fieldErrors: reviewErrors };
  }

  const stmts = buildCoachChildStatements({
    feedbackId,
    goals,
    actions,
    ratings,
    prevGoals,
    prevActions,
    formData,
  });
  return { stmts };
}

async function runBatch(stmts: Stmt[]): Promise<void> {
  if (stmts.length === 0) return;
  await db.batch(stmts as [Stmt, ...Stmt[]]);
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type FeedbackFormState = {
  ok: boolean;
  fieldErrors?: Record<string, string>;
  message?: string;
};

async function requireSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
}

function toFieldErrors(
  issues: ReadonlyArray<{ path: PropertyKey[]; message: string }>,
): Record<string, string> {
  const fe: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !fe[key]) fe[key] = issue.message;
  }
  return fe;
}

function parseFeedback(formData: FormData) {
  const raw: Record<string, unknown> = {
    formType: formData.get("formType"),
    meetingNumber: formData.get("meetingNumber"),
    meetingDate: formData.get("meetingDate"),
    season: formData.get("season"),
  };
  for (const k of FEEDBACK_CONTENT_FIELDS) raw[k] = formData.get(k);
  return feedbackSchema.safeParse(raw);
}

// Header + every content field (absent → null), so an UPDATE clears fields the
// posted template omitted. formType is immutable on edit, so only that template applies.
function toValues(d: FeedbackParsed) {
  const out: Record<string, unknown> = {
    formType: d.formType,
    meetingNumber: d.meetingNumber,
    meetingDate: d.meetingDate,
    season: d.season,
  };
  for (const k of FEEDBACK_CONTENT_FIELDS) {
    out[k] = (d as Record<string, unknown>)[k] ?? null;
  }
  return out as typeof feedbackForms.$inferInsert;
}

// Public-submit boundary: only Side A keys ever reach the `.set()`. Coach columns
// are never named here, so they stay untouched on an athlete submit.
function parseAthletePrep(formData: FormData) {
  const raw: Record<string, unknown> = { formType: formData.get("formType") };
  for (const k of FEEDBACK_ATHLETE_FIELDS) raw[k] = formData.get(k);
  return athletePrepSchema.safeParse(raw);
}

function toAthleteValues(d: AthletePrepParsed): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of FEEDBACK_ATHLETE_FIELDS) {
    out[k] = (d as Record<string, unknown>)[k] ?? null;
  }
  return out;
}

// Next gesprek number for the athlete this season (coach can override at the meeting),
// clamped to the template's per-season max.
async function nextMeetingNumber(
  athleteId: string,
  season: string,
  formType: FormType,
): Promise<number> {
  const [row] = await db
    .select({ max: sql<number | null>`max(${feedbackForms.meetingNumber})` })
    .from(feedbackForms)
    .where(
      and(
        eq(feedbackForms.athleteId, athleteId),
        eq(feedbackForms.season, season),
      ),
    );
  return Math.min((row?.max ?? 0) + 1, maxMeetingNumber(formType));
}

// Read the athlete's repertoire so we know which kr_* keys the form posted, then
// turn them into child rows for the given feedback id (U12 posts none).
async function readKataRatings(
  athleteId: string,
  formData: FormData,
): Promise<KataRatingInput[]> {
  const repertoire = await getAthleteKata(athleteId);
  return parseKataRatings(
    formData,
    repertoire.map((r) => r.kataId),
  );
}

async function insertKataRatings(
  feedbackId: string,
  ratings: KataRatingInput[],
) {
  if (ratings.length === 0) return;
  await db
    .insert(feedbackKataRatings)
    .values(ratings.map((r) => ({ ...r, feedbackId })));
}

// Upsert one reflection per windowed competition (unique on competitionId+athleteId),
// stamping the meeting whose prep captured it. Re-submitting overwrites in place.
async function upsertCompetitionReflections(
  meetingId: string,
  athleteId: string,
  rows: CompetitionReflectionInput[],
) {
  if (rows.length === 0) return;
  const stmts = rows.map(({ competitionId, ...fields }) =>
    db
      .insert(competitionAthleteReflection)
      .values({
        competitionId,
        athleteId,
        reflectedAtMeetingId: meetingId,
        ...fields,
      })
      .onConflictDoUpdate({
        target: [
          competitionAthleteReflection.competitionId,
          competitionAthleteReflection.athleteId,
        ],
        set: { reflectedAtMeetingId: meetingId, ...fields, updatedAt: new Date() },
      }),
  );
  await runBatch(stmts as Stmt[]);
}

export async function createFeedback(
  _prev: FeedbackFormState,
  formData: FormData,
): Promise<FeedbackFormState> {
  await requireSession();
  const athleteId = String(formData.get("athleteId") ?? "");
  if (!athleteId) return { ok: false, message: "Onbekende atleet." };

  const parsed = parseFeedback(formData);
  if (!parsed.success) {
    return { ok: false, fieldErrors: toFieldErrors(parsed.error.issues) };
  }

  // Generate the id up front so children + review writes can reference the new
  // meeting inside ONE db.batch (neon-http batch can't read a row it just inserted).
  const id = crypto.randomUUID();
  const now = new Date();
  const children = await gatherCoachChildren(athleteId, id, parsed.data, formData, now);
  if ("fieldErrors" in children) return { ok: false, fieldErrors: children.fieldErrors };

  // Fill-in-person path: created already completed (column default), stamp completedAt.
  const parent = db
    .insert(feedbackForms)
    .values({ ...toValues(parsed.data), id, athleteId, completedAt: now });
  await runBatch([parent, ...children.stmts]);

  revalidatePath(`/athletes/${athleteId}`);
  redirect(`/athletes/${athleteId}/feedback/${id}`);
}

export async function updateFeedback(
  _prev: FeedbackFormState,
  formData: FormData,
): Promise<FeedbackFormState> {
  await requireSession();
  const athleteId = String(formData.get("athleteId") ?? "");
  const id = String(formData.get("id") ?? "");
  if (!athleteId || !id) return { ok: false, message: "Onbekend gesprek." };

  const parsed = parseFeedback(formData);
  if (!parsed.success) {
    return { ok: false, fieldErrors: toFieldErrors(parsed.error.issues) };
  }

  const existing = await getFeedbackById(id);
  if (!existing) return { ok: false, message: "Onbekend gesprek." };

  const children = await gatherCoachChildren(
    athleteId,
    id,
    parsed.data,
    formData,
    existing.createdAt,
  );
  if ("fieldErrors" in children) return { ok: false, fieldErrors: children.fieldErrors };

  const parent = db
    .update(feedbackForms)
    .set(toValues(parsed.data))
    .where(eq(feedbackForms.id, id));
  await runBatch([parent, ...children.stmts]);

  revalidatePath(`/athletes/${athleteId}`);
  redirect(`/athletes/${athleteId}/feedback/${id}`);
}

// ── Prepared-flow actions ─────────────────────────────────────────────────────

/**
 * Coach: create an athlete-prepare DRAFT (Side A only, no content yet). Mints the
 * public prepare token and lands the coach on the detail page where the copy-link
 * and pending status live.
 */
export async function createFeedbackDraft(
  _prev: FeedbackFormState,
  formData: FormData,
): Promise<FeedbackFormState> {
  await requireSession();
  const athleteId = String(formData.get("athleteId") ?? "");
  const formType = formData.get("formType");
  if (!athleteId || !isFormType(formType)) {
    return { ok: false, message: "Onbekende atleet." };
  }

  const season = currentSeason();
  const [created] = await db
    .insert(feedbackForms)
    .values({
      athleteId,
      formType,
      meetingNumber: await nextMeetingNumber(athleteId, season, formType),
      meetingDate: new Date().toISOString().slice(0, 10), // placeholder; coach fixes at the meeting
      season,
      status: "awaiting_athlete",
      prepareToken: crypto.randomUUID(),
    })
    .returning({ id: feedbackForms.id });

  revalidatePath(`/athletes/${athleteId}`);
  redirect(`/athletes/${athleteId}/feedback/${created.id}`);
}

/**
 * PUBLIC (no session): the athlete fills their Side A via the prepare link. Bound to
 * the token by the page (`submitAthletePreparation.bind(null, token)`), so the token
 * is server-controlled, not a trusted form field. One-shot: only `awaiting_athlete`
 * forms accept a submit; coach fields are never in the `.set()`.
 */
export async function submitAthletePreparation(
  prepareToken: string,
  _prev: FeedbackFormState,
  formData: FormData,
): Promise<FeedbackFormState> {
  if (!UUID_RE.test(prepareToken)) return { ok: false, message: "Ongeldige link." };

  const hdrs = await headers();
  const ip =
    hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!prepareRateLimiter.check(`${ip}:${prepareToken}`).ok) {
    return {
      ok: false,
      message: "Te veel pogingen. Probeer het over een minuut opnieuw.",
    };
  }

  const [form] = await db
    .select()
    .from(feedbackForms)
    .where(eq(feedbackForms.prepareToken, prepareToken));
  if (!form) return { ok: false, message: "Niet gevonden." };
  if (form.status === "completed") {
    return { ok: false, message: "Dit gesprek is al gehouden." };
  }
  if (form.status === "athlete_submitted") {
    return { ok: false, message: "Je hebt dit formulier al ingediend." };
  }

  const parsed = parseAthletePrep(formData);
  if (!parsed.success) {
    return { ok: false, fieldErrors: toFieldErrors(parsed.error.issues) };
  }

  // Previous meeting's open items the athlete self-disposes. Re-derived server-side
  // from the token's athlete — never trust a posted feedback id (public boundary).
  const prev = await getPreviousMeeting(form.athleteId, {
    id: form.id,
    meetingDate: form.meetingDate,
    createdAt: form.createdAt,
  });
  const prevGoals = prev ? await getOpenGoalsForReview(prev.id) : [];
  const prevActions = prev ? await getPendingActionsForReview(prev.id) : [];
  const reviewErrors = validateAthleteReview(formData, prevGoals, prevActions);
  if (Object.keys(reviewErrors).length > 0) {
    return { ok: false, fieldErrors: reviewErrors };
  }

  const ratings = await readKataRatings(form.athleteId, formData);
  // Race-safe: the `status` guard in the WHERE makes a concurrent coach-complete a no-op.
  const updated = await db
    .update(feedbackForms)
    .set({
      ...toAthleteValues(parsed.data),
      status: "athlete_submitted",
      athleteSubmittedAt: new Date(),
    })
    .where(
      and(
        eq(feedbackForms.id, form.id),
        eq(feedbackForms.status, "awaiting_athlete"),
      ),
    )
    .returning({ id: feedbackForms.id });
  if (updated.length === 0) {
    return { ok: false, message: "Dit gesprek is al gehouden." };
  }

  await db
    .delete(feedbackKataRatings)
    .where(eq(feedbackKataRatings.feedbackId, form.id));
  await insertKataRatings(form.id, ratings);

  // Competition reflections (CADET+). Re-derive the window server-side so a smuggled
  // competition id is never honoured, then upsert one row per windowed competition.
  if (showsCompetitionSection(form.formType)) {
    const window = await getMeetingCompetitionWindow({
      id: form.id,
      athleteId: form.athleteId,
      meetingDate: form.meetingDate,
      createdAt: form.createdAt,
    });
    const reflections = parseCompetitionReflections(
      formData,
      window.map((c) => c.competitionId),
    );
    await upsertCompetitionReflections(form.id, form.athleteId, reflections);
  }

  // Athlete self-claim onto the PREVIOUS meeting's open rows (athlete* columns only,
  // scoped to open state). After the guarded submit succeeded.
  await runBatch(buildAthleteReviewStatements(formData, prevGoals, prevActions));

  // Best-effort coach notification, after the response flushes — an email failure
  // must never break the athlete's submit.
  after(async () => {
    try {
      const athlete = await getAthleteById(form.athleteId);
      if (!athlete) return;
      await sendCoachSubmittedNotice({
        athleteId: athlete.id,
        athleteName: `${athlete.firstName} ${athlete.lastName}`,
        feedbackId: form.id,
        meetingNumber: form.meetingNumber,
      });
    } catch {
      // swallow — notification is non-critical
    }
  });

  revalidatePath(`/feedback/prepare/${prepareToken}`);
  revalidatePath(`/athletes/${form.athleteId}`);
  return { ok: true };
}

/**
 * Coach: email the prepare link to the athlete's contact (first send or reminder).
 * Refuses when consent is missing for a minor or no contact email is on file, and
 * stamps `lastReminderAt` so the cron won't double-nudge.
 */
export async function sendPrepareEmail(
  _prev: FeedbackFormState,
  formData: FormData,
): Promise<FeedbackFormState> {
  await requireSession();
  const athleteId = String(formData.get("athleteId") ?? "");
  const id = String(formData.get("id") ?? "");
  if (!athleteId || !id) return { ok: false, message: "Onbekend gesprek." };

  const [athlete, form] = await Promise.all([
    getAthleteById(athleteId),
    getFeedbackById(id),
  ]);
  if (!athlete || !form || form.athleteId !== athlete.id || !form.prepareToken) {
    return { ok: false, message: "Onbekend gesprek." };
  }
  if (form.status !== "awaiting_athlete") {
    return { ok: false, message: nl.feedback.status[form.status] };
  }

  const recipient = resolveRecipient(athlete);
  if (!recipient.ok) {
    return {
      ok: false,
      message:
        recipient.reason === "consent"
          ? nl.feedback.sendBlockedConsent
          : nl.feedback.sendNoEmail,
    };
  }

  const res = await sendPrepareInvite({
    to: recipient.email,
    athleteName: athlete.firstName,
    prepareToken: form.prepareToken,
    meetingNumber: form.meetingNumber,
    formId: form.id,
    isReminder: form.lastReminderAt != null,
  });
  if (!res.ok) {
    return {
      ok: false,
      message:
        res.error === "email-not-configured"
          ? nl.feedback.emailNotConfigured
          : nl.feedback.sendFailed,
    };
  }

  await db
    .update(feedbackForms)
    .set({ lastReminderAt: new Date() })
    .where(eq(feedbackForms.id, form.id));
  revalidatePath(`/athletes/${athleteId}/feedback/${form.id}`);
  return { ok: true, message: nl.feedback.linkSent };
}

/** PUBLIC: stamp the first-open time (set-once via the isNull guard). */
export async function markPrepareOpened(prepareToken: string): Promise<void> {
  if (!UUID_RE.test(prepareToken)) return;
  await db
    .update(feedbackForms)
    .set({ athleteOpenedAt: new Date() })
    .where(
      and(
        eq(feedbackForms.prepareToken, prepareToken),
        isNull(feedbackForms.athleteOpenedAt),
      ),
    );
}

/**
 * Coach: finalize the in-person meeting. Same write as `updateFeedback` (full union,
 * so the coach can override any soft-locked Side A field) plus the completed stamp —
 * this is the point the gesprek starts counting as a finished meeting.
 */
export async function completeFeedback(
  _prev: FeedbackFormState,
  formData: FormData,
): Promise<FeedbackFormState> {
  await requireSession();
  const athleteId = String(formData.get("athleteId") ?? "");
  const id = String(formData.get("id") ?? "");
  if (!athleteId || !id) return { ok: false, message: "Onbekend gesprek." };

  const parsed = parseFeedback(formData);
  if (!parsed.success) {
    return { ok: false, fieldErrors: toFieldErrors(parsed.error.issues) };
  }

  const existing = await getFeedbackById(id);
  if (!existing) return { ok: false, message: "Onbekend gesprek." };

  const children = await gatherCoachChildren(
    athleteId,
    id,
    parsed.data,
    formData,
    existing.createdAt,
  );
  if ("fieldErrors" in children) return { ok: false, fieldErrors: children.fieldErrors };

  const parent = db
    .update(feedbackForms)
    .set({ ...toValues(parsed.data), status: "completed", completedAt: new Date() })
    .where(eq(feedbackForms.id, id));
  await runBatch([parent, ...children.stmts]);

  revalidatePath(`/athletes/${athleteId}`);
  redirect(`/athletes/${athleteId}/feedback/${id}`);
}

/** Coach: delete an abandoned draft (refuses completed gesprekken). */
export async function deleteFeedbackDraft(
  _prev: FeedbackFormState,
  formData: FormData,
): Promise<FeedbackFormState> {
  await requireSession();
  const athleteId = String(formData.get("athleteId") ?? "");
  const id = String(formData.get("id") ?? "");
  if (!athleteId || !id) return { ok: false, message: "Onbekend gesprek." };

  await db
    .delete(feedbackForms)
    .where(
      and(
        eq(feedbackForms.id, id),
        eq(feedbackForms.athleteId, athleteId),
        // Never delete a finished gesprek through this path.
        ne(feedbackForms.status, "completed"),
      ),
    );

  revalidatePath(`/athletes/${athleteId}`);
  redirect(`/athletes/${athleteId}?tab=feedback`);
}
