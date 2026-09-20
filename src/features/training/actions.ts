"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { isPortalBlocked } from "@/features/athletes/consent";
import { auth } from "@/lib/auth";
import {
  getAthleteById,
  getAthleteByViewToken,
} from "@/lib/queries/athletes";
import {
  deleteLearning as deleteLearningRow,
  getBlockOwner,
  getSessionById,
  setSessionSkipped,
  updateBlock,
  updateSessionAthleteNotes,
  upsertTimings,
} from "@/lib/queries/training";
import { prepareRateLimiter } from "@/lib/rate-limit";
import { splitSchema, timingInputSchema } from "./schema";

export type LearningFormState = { ok: boolean; message?: string };
export type TrainingFormState = { ok: boolean; message?: string };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

// ── Session / block writes (coach and portal share one core) ────────────────

const writeSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("skipSession"), id: z.uuid(), skipped: z.coerce.boolean() }),
  z.object({ kind: z.literal("skipBlock"), id: z.uuid(), skipped: z.coerce.boolean() }),
  z.object({
    kind: z.literal("actualReps"),
    id: z.uuid(),
    reps: z.union([z.literal(""), z.coerce.number().int().min(0).max(99)]),
  }),
  z.object({ kind: z.literal("athleteNotes"), id: z.uuid(), text: z.string().max(2000) }),
]);
type Write = z.infer<typeof writeSchema>;

function parseWrite(fd: FormData): Write | null {
  const r = writeSchema.safeParse({
    kind: fd.get("kind"),
    id: fd.get("id"),
    skipped: fd.get("skipped") === "true",
    reps: fd.get("reps") ?? "",
    text: fd.get("text") ?? "",
  });
  return r.success ? r.data : null;
}

/** Ownership check against the athlete, then apply. Returns the session id. */
async function applyWrite(athleteId: string, w: Write): Promise<string | null> {
  if (w.kind === "skipBlock" || w.kind === "actualReps") {
    const owner = await getBlockOwner(w.id);
    if (!owner || owner.athleteId !== athleteId) return null;
    await updateBlock(
      w.id,
      w.kind === "skipBlock"
        ? { skipped: w.skipped }
        : { actualReps: w.reps === "" ? null : w.reps },
    );
    return owner.sessionId;
  }
  const s = await getSessionById(w.id);
  if (!s || s.athleteId !== athleteId) return null;
  if (w.kind === "skipSession") await setSessionSkipped(w.id, w.skipped);
  else await updateSessionAthleteNotes(w.id, w.text.trim() || null);
  return s.id;
}

function revalidateTraining(athleteId: string, viewToken: string) {
  revalidatePath(`/athletes/${athleteId}`, "layout");
  revalidatePath(`/athlete/view/${viewToken}`, "layout");
}

/** COACH: skip / unskip, actual reps, athlete notes on behalf of the athlete. */
export async function trainingWrite(
  _prev: TrainingFormState,
  formData: FormData,
): Promise<TrainingFormState> {
  await requireSession();
  const athleteId = String(formData.get("athleteId") ?? "");
  const a = await getAthleteById(athleteId);
  const w = parseWrite(formData);
  if (!a || !w) return { ok: false, message: "Ongeldige invoer." };
  const sid = await applyWrite(a.id, w);
  if (!sid) return { ok: false, message: "Niet gevonden." };
  revalidateTraining(a.id, a.viewToken);
  return { ok: true };
}

/**
 * PUBLIC (no session): the athlete logs from the portal. Bound to the view token by
 * the page (`portalTrainingWrite.bind(null, token)`), never a form field. Consent
 * re-checked; rows verified to belong to the token's athlete.
 */
export async function portalTrainingWrite(
  token: string,
  _prev: TrainingFormState,
  formData: FormData,
): Promise<TrainingFormState> {
  if (!UUID_RE.test(token)) return { ok: false, message: "Ongeldige link." };
  const ip =
    (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!prepareRateLimiter.check(`${ip}:${token}`).ok) {
    return { ok: false, message: "Te veel pogingen. Probeer het over een minuut opnieuw." };
  }
  const a = await getAthleteByViewToken(token);
  if (!a || isPortalBlocked(a)) return { ok: false, message: "Niet gevonden." };
  const w = parseWrite(formData);
  if (!w) return { ok: false, message: "Ongeldige invoer." };
  const sid = await applyWrite(a.id, w);
  if (!sid) return { ok: false, message: "Niet gevonden." };
  revalidateTraining(a.id, a.viewToken);
  return { ok: true };
}

// ── Section timings (coach only) ─────────────────────────────────────────────

/** Fields `s:<split>:<index>` per kata; empty cells are left untouched. */
export async function saveTimings(
  _prev: TrainingFormState,
  formData: FormData,
): Promise<TrainingFormState> {
  await requireSession();
  const timings: { split: z.infer<typeof splitSchema>; sectionIndex: number; seconds: number }[] = [];
  for (const [k, v] of formData.entries()) {
    const m = /^s:(\w+):(\d)$/.exec(k);
    if (!m || typeof v !== "string" || v.trim() === "") continue;
    const split = splitSchema.safeParse(m[1]);
    if (!split.success) continue;
    timings.push({ split: split.data, sectionIndex: Number(m[2]), seconds: Number(v) });
  }
  // ponytail: clearing a cell is not supported; set the seconds again to overwrite.
  if (timings.length === 0) return { ok: true };
  const parsed = timingInputSchema.safeParse({
    athleteId: formData.get("athleteId"),
    kataId: formData.get("kataId"),
    timings,
  });
  if (!parsed.success) return { ok: false, message: "Ongeldige tijden (1–600 s)." };
  await upsertTimings(parsed.data);
  const a = await getAthleteById(parsed.data.athleteId ?? "");
  if (a) revalidateTraining(a.id, a.viewToken);
  return { ok: true };
}
