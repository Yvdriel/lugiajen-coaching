"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { deleteLearning as deleteLearningRow } from "@/lib/queries/training";

export type LearningFormState = { ok: boolean; message?: string };

async function requireSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
}

/** Coach deletes a wrong learning (the only edit learnings ever get; ADR 0001). */
export async function deleteLearning(
  _prev: LearningFormState,
  formData: FormData,
): Promise<LearningFormState> {
  await requireSession();
  const id = String(formData.get("id") ?? "");
  const athleteId = String(formData.get("athleteId") ?? "");
  if (!id) return { ok: false, message: "Onbekend inzicht." };
  await deleteLearningRow(id);
  if (athleteId) revalidatePath(`/athletes/${athleteId}`);
  return { ok: true };
}
