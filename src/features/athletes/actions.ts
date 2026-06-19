"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { athleteNotes, athletes } from "@/db/schema";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendConsentRequest } from "@/lib/email/send";
import { getAthleteById } from "@/lib/queries/athletes";
import { nl } from "@/messages/nl";
import { CONSENT_LINK_DAYS } from "./consent";
import { type AthleteParsed, athleteSchema } from "./schema";

export type AthleteFormState = {
  ok: boolean;
  fieldErrors?: Record<string, string>;
  message?: string;
};

// Every mutating action re-checks the session itself (convention 2).
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

function parseAthlete(formData: FormData) {
  return athleteSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    dateOfBirth: formData.get("dateOfBirth"),
    gender: formData.get("gender"),
    beltRank: formData.get("beltRank"),
    yearsTraining: formData.get("yearsTraining"),
    yearsCompeting: formData.get("yearsCompeting"),
    heightCm: formData.get("heightCm"),
    weightKg: formData.get("weightKg"),
    notes: formData.get("notes"),
    physicalNotes: formData.get("physicalNotes"),
    contactEmail: formData.get("contactEmail"),
    isActive: formData.get("isActive"),
  });
}

// Map parsed form data → athlete columns. Consent columns are intentionally NOT
// here: the coach can't set them; only the public consent submit writes them.
function toAthleteColumns(d: AthleteParsed) {
  return {
    firstName: d.firstName,
    lastName: d.lastName,
    dateOfBirth: d.dateOfBirth,
    gender: d.gender,
    beltRank: d.beltRank,
    yearsTraining: d.yearsTraining,
    yearsCompeting: d.yearsCompeting ?? null,
    heightCm: d.heightCm ?? null,
    weightKg: d.weightKg ?? null,
    notes: d.notes ?? null,
    physicalNotes: d.physicalNotes ?? null,
    contactEmail: d.contactEmail ?? null,
    isActive: d.isActive,
  };
}

export async function createAthlete(
  _prev: AthleteFormState,
  formData: FormData,
): Promise<AthleteFormState> {
  await requireSession();
  const parsed = parseAthlete(formData);
  if (!parsed.success) {
    return { ok: false, fieldErrors: toFieldErrors(parsed.error.issues) };
  }
  const [created] = await db
    .insert(athletes)
    .values(toAthleteColumns(parsed.data))
    .returning({ id: athletes.id });
  revalidatePath("/athletes");
  revalidatePath("/dashboard");
  redirect(`/athletes/${created.id}`);
}

export async function updateAthlete(
  _prev: AthleteFormState,
  formData: FormData,
): Promise<AthleteFormState> {
  await requireSession();
  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, message: "Onbekende atleet." };

  const parsed = parseAthlete(formData);
  if (!parsed.success) {
    return { ok: false, fieldErrors: toFieldErrors(parsed.error.issues) };
  }
  // Consent columns are untouched here (not in toAthleteColumns), so the parent's
  // recorded consent survives any coach edit.
  await db
    .update(athletes)
    .set(toAthleteColumns(parsed.data))
    .where(eq(athletes.id, id));

  revalidatePath(`/athletes/${id}`);
  revalidatePath("/athletes");
  redirect(`/athletes/${id}`);
}

/**
 * Rotate an athlete's public `view_token` (Ch10). Invalidates the old share link
 * immediately (the old token no longer resolves → 404) and mints a fresh one.
 */
export async function rotateViewToken(
  _prev: AthleteFormState,
  formData: FormData,
): Promise<AthleteFormState> {
  await requireSession();
  const athleteId = String(formData.get("athleteId") ?? "");
  if (!athleteId) return { ok: false, message: "Onbekende atleet." };
  await db
    .update(athletes)
    .set({ viewToken: crypto.randomUUID() })
    .where(eq(athletes.id, athleteId));
  revalidatePath(`/athletes/${athleteId}`);
  return { ok: true };
}

/**
 * Coach: email a parental-consent request. Mints a fresh 7-day one-shot token and
 * sends the public consent link. When the athlete has no contact email yet, the
 * dialog passes one (`email`), which is also saved. The token is only persisted
 * when the email actually sends — no dead links. The coach never sets consent
 * itself; that only happens when the parent submits the consent form.
 */
export async function sendConsentEmail(
  _prev: AthleteFormState,
  formData: FormData,
): Promise<AthleteFormState> {
  await requireSession();
  const athleteId = String(formData.get("athleteId") ?? "");
  if (!athleteId) return { ok: false, message: "Onbekende atleet." };

  const athlete = await getAthleteById(athleteId);
  if (!athlete) return { ok: false, message: "Onbekende atleet." };

  const emailRaw = String(formData.get("email") ?? "").trim();
  let email = athlete.contactEmail ?? "";
  if (emailRaw) {
    const parsed = z.string().email().safeParse(emailRaw);
    if (!parsed.success) {
      return { ok: false, fieldErrors: { email: "Ongeldig e-mailadres." } };
    }
    email = parsed.data;
  }
  if (!email) {
    return { ok: false, message: nl.athlete.privacy.noContactEmail };
  }

  const token = crypto.randomUUID();
  const res = await sendConsentRequest({
    to: email,
    athleteName: `${athlete.firstName} ${athlete.lastName}`,
    token,
  });
  if (!res.ok) {
    return {
      ok: false,
      message:
        res.error === "email-not-configured"
          ? nl.athlete.privacy.emailNotConfigured
          : nl.athlete.privacy.sendFailed,
    };
  }

  const expiresAt = new Date(
    Date.now() + CONSENT_LINK_DAYS * 24 * 60 * 60 * 1000,
  );
  await db
    .update(athletes)
    .set({
      consentToken: token,
      consentTokenExpiresAt: expiresAt,
      ...(emailRaw ? { contactEmail: email } : {}),
    })
    .where(eq(athletes.id, athleteId));

  revalidatePath(`/athletes/${athleteId}`);
  return { ok: true, message: nl.athlete.privacy.consentSent };
}

export async function addAthleteNote(
  _prev: AthleteFormState,
  formData: FormData,
): Promise<AthleteFormState> {
  await requireSession();
  const athleteId = String(formData.get("athleteId") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!athleteId) return { ok: false, message: "Onbekende atleet." };
  if (!body) {
    return { ok: false, fieldErrors: { body: "Notitie mag niet leeg zijn." } };
  }
  await db.insert(athleteNotes).values({ athleteId, body });
  revalidatePath(`/athletes/${athleteId}`);
  return { ok: true };
}
