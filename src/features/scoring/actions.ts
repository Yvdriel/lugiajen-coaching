"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { kataScoringCards } from "@/db/schema";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { INPUT_CRITERIA, TEXT_FIELDS } from "./criteria";
import { scoringCardSchema } from "./schema";

export type ScoringFormState = {
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

/** Append-only: every save INSERTs a new snapshot (convention 5). Never UPDATE. */
export async function saveScoringCard(
  _prev: ScoringFormState,
  formData: FormData,
): Promise<ScoringFormState> {
  await requireSession();
  const athleteId = String(formData.get("athleteId") ?? "");
  const kataId = String(formData.get("kataId") ?? "");
  if (!athleteId || !kataId) {
    return { ok: false, message: "Onbekende atleet of kata." };
  }

  const raw: Record<string, unknown> = {
    assessmentDate: formData.get("assessmentDate"),
  };
  for (const c of INPUT_CRITERIA) raw[c.key] = formData.get(c.key);
  for (const k of TEXT_FIELDS) raw[k] = formData.get(k);

  const parsed = scoringCardSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, fieldErrors: toFieldErrors(parsed.error.issues) };
  }

  await db.insert(kataScoringCards).values({ athleteId, kataId, ...parsed.data });

  revalidatePath(`/athletes/${athleteId}`);
  redirect(`/athletes/${athleteId}?tab=scoring&scoreKata=${kataId}`);
}
