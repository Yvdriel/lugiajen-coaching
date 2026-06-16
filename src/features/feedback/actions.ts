"use server";

import { and, eq, isNull, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { feedbackForms, feedbackKataRatings } from "@/db/schema";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getAthleteKata } from "@/lib/queries/kata";
import { prepareRateLimiter } from "@/lib/rate-limit";
import { currentSeason, type FormType, isFormType, maxMeetingNumber } from "./form-type";
import {
  type AthletePrepParsed,
  athletePrepSchema,
  FEEDBACK_ATHLETE_FIELDS,
  FEEDBACK_CONTENT_FIELDS,
  type FeedbackParsed,
  feedbackSchema,
  type KataRatingInput,
  parseKataRatings,
} from "./schema";

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

  const ratings = await readKataRatings(athleteId, formData);
  // Fill-in-person path: created already completed (column default), stamp completedAt.
  const [created] = await db
    .insert(feedbackForms)
    .values({ ...toValues(parsed.data), athleteId, completedAt: new Date() })
    .returning({ id: feedbackForms.id });
  await insertKataRatings(created.id, ratings);

  revalidatePath(`/athletes/${athleteId}`);
  redirect(`/athletes/${athleteId}/feedback/${created.id}`);
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

  const ratings = await readKataRatings(athleteId, formData);
  await db
    .update(feedbackForms)
    .set(toValues(parsed.data))
    .where(eq(feedbackForms.id, id));
  // Replace the kata-rating set (append-free; the form posts the full set).
  await db
    .delete(feedbackKataRatings)
    .where(eq(feedbackKataRatings.feedbackId, id));
  await insertKataRatings(id, ratings);

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

  revalidatePath(`/feedback/prepare/${prepareToken}`);
  revalidatePath(`/athletes/${form.athleteId}`);
  return { ok: true };
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

  const ratings = await readKataRatings(athleteId, formData);
  await db
    .update(feedbackForms)
    .set({ ...toValues(parsed.data), status: "completed", completedAt: new Date() })
    .where(eq(feedbackForms.id, id));
  await db
    .delete(feedbackKataRatings)
    .where(eq(feedbackKataRatings.feedbackId, id));
  await insertKataRatings(id, ratings);

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
