"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { feedbackForms } from "@/db/schema";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  FEEDBACK_CONTENT_FIELDS,
  type FeedbackParsed,
  feedbackSchema,
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

  const [created] = await db
    .insert(feedbackForms)
    .values({ ...toValues(parsed.data), athleteId })
    .returning({ id: feedbackForms.id });

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

  await db
    .update(feedbackForms)
    .set(toValues(parsed.data))
    .where(eq(feedbackForms.id, id));

  revalidatePath(`/athletes/${athleteId}`);
  redirect(`/athletes/${athleteId}/feedback/${id}`);
}
