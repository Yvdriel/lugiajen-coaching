"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { athleteKata } from "@/db/schema";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { athleteKataSchema } from "./schema";

export type AthleteKataFormState = {
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

function parseRepertoire(formData: FormData) {
  return athleteKataSchema.safeParse({
    roundOrder: formData.get("roundOrder"),
    isCompetitionKata: formData.get("isCompetitionKata"),
    notes: formData.get("notes"),
  });
}

export async function assignKata(
  _prev: AthleteKataFormState,
  formData: FormData,
): Promise<AthleteKataFormState> {
  await requireSession();
  const athleteId = String(formData.get("athleteId") ?? "");
  const kataId = String(formData.get("kataId") ?? "");
  if (!athleteId) return { ok: false, message: "Onbekende atleet." };
  if (!kataId) {
    return { ok: false, fieldErrors: { kataId: "Kies een kata." } };
  }

  const parsed = parseRepertoire(formData);
  if (!parsed.success) {
    return { ok: false, fieldErrors: toFieldErrors(parsed.error.issues) };
  }
  const d = parsed.data;
  await db.insert(athleteKata).values({
    athleteId,
    kataId,
    roundOrder: d.roundOrder ?? null,
    isCompetitionKata: d.isCompetitionKata,
    notes: d.notes ?? null,
  });
  revalidatePath(`/athletes/${athleteId}`);
  return { ok: true };
}

export async function updateAthleteKata(
  _prev: AthleteKataFormState,
  formData: FormData,
): Promise<AthleteKataFormState> {
  await requireSession();
  const athleteId = String(formData.get("athleteId") ?? "");
  const id = String(formData.get("id") ?? "");
  if (!athleteId || !id) return { ok: false, message: "Onbekende rij." };

  const parsed = parseRepertoire(formData);
  if (!parsed.success) {
    return { ok: false, fieldErrors: toFieldErrors(parsed.error.issues) };
  }
  const d = parsed.data;
  await db
    .update(athleteKata)
    .set({
      roundOrder: d.roundOrder ?? null,
      isCompetitionKata: d.isCompetitionKata,
      notes: d.notes ?? null,
    })
    .where(eq(athleteKata.id, id));
  revalidatePath(`/athletes/${athleteId}`);
  redirect(`/athletes/${athleteId}?tab=kata`);
}

export async function removeAthleteKata(
  _prev: AthleteKataFormState,
  formData: FormData,
): Promise<AthleteKataFormState> {
  await requireSession();
  const athleteId = String(formData.get("athleteId") ?? "");
  const id = String(formData.get("id") ?? "");
  if (!athleteId || !id) return { ok: false, message: "Onbekende rij." };

  await db.delete(athleteKata).where(eq(athleteKata.id, id));
  revalidatePath(`/athletes/${athleteId}`);
  return { ok: true };
}
