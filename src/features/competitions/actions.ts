"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { competitionEntries, competitions } from "@/db/schema";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  type CompetitionEntryParsed,
  ENTRY_CONTENT_FIELDS,
  competitionEntrySchema,
  competitionSchema,
} from "./schema";

// Competition-level actions used outside the wizard (create/edit/delete) keep the
// usual redirect pattern. Entry-level + add-athletes actions return typed results
// (no redirect) so the client wizard can advance on `state.ok` (convention 2).

export type CompetitionFormState = {
  ok: boolean;
  id?: string;
  fieldErrors?: Record<string, string>;
  message?: string;
};

export type EntryFormState = {
  ok: boolean;
  entries?: { id: string; athleteId: string }[];
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

function parseCompetition(formData: FormData) {
  return competitionSchema.safeParse({
    name: formData.get("name"),
    date: formData.get("date"),
    competitionType: formData.get("competitionType"),
    location: formData.get("location"),
    notes: formData.get("notes"),
  });
}

function parseEntry(formData: FormData) {
  const raw: Record<string, unknown> = { category: formData.get("category") };
  for (const k of ENTRY_CONTENT_FIELDS) raw[k] = formData.get(k);
  return competitionEntrySchema.safeParse(raw);
}

// category + every content field (absent → null), so an UPDATE clears emptied fields.
function toEntryValues(d: CompetitionEntryParsed) {
  const out: Record<string, unknown> = { category: d.category };
  for (const k of ENTRY_CONTENT_FIELDS) {
    out[k] = (d as Record<string, unknown>)[k] ?? null;
  }
  return out as Partial<typeof competitionEntries.$inferInsert>;
}

export async function createCompetition(
  _prev: CompetitionFormState,
  formData: FormData,
): Promise<CompetitionFormState> {
  await requireSession();
  const parsed = parseCompetition(formData);
  if (!parsed.success) {
    return { ok: false, fieldErrors: toFieldErrors(parsed.error.issues) };
  }
  const d = parsed.data;
  const [created] = await db
    .insert(competitions)
    .values({
      name: d.name,
      date: d.date,
      competitionType: d.competitionType,
      location: d.location ?? null,
      notes: d.notes ?? null,
    })
    .returning({ id: competitions.id });

  revalidatePath("/competitions");
  return { ok: true, id: created.id };
}

export async function updateCompetition(
  _prev: CompetitionFormState,
  formData: FormData,
): Promise<CompetitionFormState> {
  await requireSession();
  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, message: "Onbekende wedstrijd." };

  const parsed = parseCompetition(formData);
  if (!parsed.success) {
    return { ok: false, fieldErrors: toFieldErrors(parsed.error.issues) };
  }
  const d = parsed.data;
  await db
    .update(competitions)
    .set({
      name: d.name,
      date: d.date,
      competitionType: d.competitionType,
      location: d.location ?? null,
      notes: d.notes ?? null,
    })
    .where(eq(competitions.id, id));

  revalidatePath("/competitions");
  revalidatePath(`/competitions/${id}`);
  redirect(`/competitions/${id}`);
}

export async function removeCompetition(
  _prev: CompetitionFormState,
  formData: FormData,
): Promise<CompetitionFormState> {
  await requireSession();
  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, message: "Onbekende wedstrijd." };

  await db.delete(competitions).where(eq(competitions.id, id));
  revalidatePath("/competitions");
  redirect("/competitions");
}

export async function addCompetitionAthletes(
  _prev: EntryFormState,
  formData: FormData,
): Promise<EntryFormState> {
  await requireSession();
  const competitionId = String(formData.get("competitionId") ?? "");
  const category = String(formData.get("category") ?? "").trim();
  const athleteIds = formData.getAll("athleteId").map(String).filter(Boolean);

  if (!competitionId) return { ok: false, message: "Onbekende wedstrijd." };
  if (athleteIds.length === 0) {
    return { ok: false, fieldErrors: { athleteId: "Kies minstens één atleet." } };
  }
  if (!category) {
    return { ok: false, fieldErrors: { category: "Categorie is verplicht." } };
  }

  // Idempotent: skip athletes already entered in this competition.
  const existing = await db
    .select({ athleteId: competitionEntries.athleteId })
    .from(competitionEntries)
    .where(eq(competitionEntries.competitionId, competitionId));
  const have = new Set(existing.map((e) => e.athleteId));
  const toAdd = athleteIds.filter((a) => !have.has(a));
  if (toAdd.length === 0) return { ok: true, entries: [] };

  // Atomic multi-row write via db.batch (convention 1) — all-or-nothing.
  const stmts = toAdd.map((athleteId) =>
    db
      .insert(competitionEntries)
      .values({ competitionId, athleteId, category })
      .returning({
        id: competitionEntries.id,
        athleteId: competitionEntries.athleteId,
      }),
  );
  const rows = await db.batch(
    stmts as [(typeof stmts)[number], ...(typeof stmts)[number][]],
  );
  const entries = rows.flat();

  revalidatePath(`/competitions/${competitionId}`);
  return { ok: true, entries };
}

export async function updateCompetitionEntry(
  _prev: EntryFormState,
  formData: FormData,
): Promise<EntryFormState> {
  await requireSession();
  const id = String(formData.get("id") ?? "");
  const competitionId = String(formData.get("competitionId") ?? "");
  const athleteId = String(formData.get("athleteId") ?? "");
  if (!id) return { ok: false, message: "Onbekende deelname." };

  const parsed = parseEntry(formData);
  if (!parsed.success) {
    return { ok: false, fieldErrors: toFieldErrors(parsed.error.issues) };
  }
  await db
    .update(competitionEntries)
    .set(toEntryValues(parsed.data))
    .where(eq(competitionEntries.id, id));

  if (competitionId) revalidatePath(`/competitions/${competitionId}`);
  if (athleteId) revalidatePath(`/athletes/${athleteId}`);
  return { ok: true };
}

export async function removeCompetitionEntry(
  _prev: EntryFormState,
  formData: FormData,
): Promise<EntryFormState> {
  await requireSession();
  const id = String(formData.get("id") ?? "");
  const competitionId = String(formData.get("competitionId") ?? "");
  const athleteId = String(formData.get("athleteId") ?? "");
  if (!id) return { ok: false, message: "Onbekende deelname." };

  await db.delete(competitionEntries).where(eq(competitionEntries.id, id));
  if (competitionId) revalidatePath(`/competitions/${competitionId}`);
  if (athleteId) revalidatePath(`/athletes/${athleteId}`);
  return { ok: true };
}
