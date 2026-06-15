import { ENTRY_ROUNDS } from "./schema";

// Pure (no React/DB) helpers shared by the display layer + the Wedstrijden-tab summary.

/** The non-null round-kata uuids performed in an entry, in round order. */
export function entryKataIds(entry: Record<string, unknown>): string[] {
  const ids: string[] = [];
  for (const r of ENTRY_ROUNDS) {
    const id = entry[r.kata];
    if (typeof id === "string" && id) ids.push(id);
  }
  return ids;
}

/** Resolve an entry's round katas to display names via a kata id→name map. */
export function entryKataNames(
  entry: Record<string, unknown>,
  kataNames: Map<string, string>,
): string[] {
  return entryKataIds(entry).map((id) => kataNames.get(id) ?? "?");
}
