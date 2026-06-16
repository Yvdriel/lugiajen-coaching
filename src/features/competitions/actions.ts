"use server";

import { eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { athletes, competitionEntries, competitions } from "@/db/schema";
import { auth } from "@/lib/auth";
import { getCategories, isCategory } from "@/lib/categories";
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
  entries?: { id: string; athleteId: string; category: string }[];
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
  if (!competitionId) return { ok: false, message: "Onbekende wedstrijd." };

  // Each `entry` is "<athleteId>:<category>" — UUIDs and category codes contain no
  // ":", so split on the first one. Builds the requested (athlete, category) pairs.
  const pairs = formData
    .getAll("entry")
    .map(String)
    .map((raw) => {
      const i = raw.indexOf(":");
      return i < 0
        ? null
        : { athleteId: raw.slice(0, i), category: raw.slice(i + 1) };
    })
    .filter((p): p is { athleteId: string; category: string } =>
      Boolean(p?.athleteId && p?.category),
    );

  if (pairs.length === 0) {
    return { ok: false, fieldErrors: { athleteId: "Kies minstens één atleet." } };
  }

  // Server-authoritative validation (convention 8): recompute each athlete's eligible
  // categories from their DOB — never trust the client's category.
  const athleteIds = [...new Set(pairs.map((p) => p.athleteId))];
  const dobRows = await db
    .select({ id: athletes.id, dateOfBirth: athletes.dateOfBirth })
    .from(athletes)
    .where(inArray(athletes.id, athleteIds));
  const eligible = new Map(
    dobRows.map((r) => [
      r.id,
      new Set<string>(getCategories(new Date(r.dateOfBirth))),
    ]),
  );
  for (const p of pairs) {
    if (!isCategory(p.category) || !eligible.get(p.athleteId)?.has(p.category)) {
      return { ok: false, message: "Ongeldige categorie voor een atleet." };
    }
  }

  // Dedup against existing (athlete, category) rows — the unique index is the
  // DB-level safety net; this keeps the response clean and avoids a conflict throw.
  const existing = await db
    .select({
      athleteId: competitionEntries.athleteId,
      category: competitionEntries.category,
    })
    .from(competitionEntries)
    .where(eq(competitionEntries.competitionId, competitionId));
  const have = new Set(existing.map((e) => `${e.athleteId}:${e.category}`));
  const toAdd = pairs.filter((p) => !have.has(`${p.athleteId}:${p.category}`));
  if (toAdd.length === 0) return { ok: true, entries: [] };

  // Atomic multi-row write via db.batch (convention 1) — all-or-nothing.
  const stmts = toAdd.map((p) =>
    db
      .insert(competitionEntries)
      .values({ competitionId, athleteId: p.athleteId, category: p.category })
      .returning({
        id: competitionEntries.id,
        athleteId: competitionEntries.athleteId,
        category: competitionEntries.category,
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
