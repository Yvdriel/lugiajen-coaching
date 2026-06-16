"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { feedbackForms, feedbackKataRatings } from "@/db/schema";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getAthleteKata } from "@/lib/queries/kata";
import {
  FEEDBACK_CONTENT_FIELDS,
  type FeedbackParsed,
  feedbackSchema,
  type KataRatingInput,
  parseKataRatings,
} from "./schema";

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
  const [created] = await db
    .insert(feedbackForms)
    .values({ ...toValues(parsed.data), athleteId })
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
