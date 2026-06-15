"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { athleteNotes, athletes } from "@/db/schema";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { athleteSchema } from "./schema";

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
    isActive: formData.get("isActive"),
  });
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
    .values(parsed.data)
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
  const d = parsed.data;
  await db
    .update(athletes)
    .set({
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
      isActive: d.isActive,
    })
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
