import type { CompetitionEntry } from "@/lib/queries/competitions";
import { ENTRY_CONTENT_FIELDS } from "./schema";

// Form default values are all strings (RHF over native FormData); the server coerces.
export type EntryValues = Record<string, string>;

const s = (v: unknown): string => (v == null ? "" : String(v));

/** Stringify a saved entry into form defaults (edit). */
export function entryToValues(entry: CompetitionEntry): EntryValues {
  const out: EntryValues = { category: entry.category };
  const rec = entry as unknown as Record<string, unknown>;
  for (const k of ENTRY_CONTENT_FIELDS) out[k] = s(rec[k]);
  return out;
}
