// Pure VLI math (Torres / del Moral; see .claude/skills/kata-methodology). No DB,
// no React. The MCP tools, the coach tab and the portal all compute through here so
// the numbers the AI plans with are the numbers the app shows.

export type Split = "full" | "half" | "third" | "quarter";

/** How many sections a split has. */
export const SPLIT_SIZE: Record<Split, number> = {
  full: 1,
  half: 2,
  third: 3,
  quarter: 4,
};

// Section-size component of intensity (VLI manual §3): quarter low … full high.
const INTENSITY_WEIGHT: Record<Split, number> = {
  quarter: 1,
  third: 2,
  half: 4,
  full: 5,
};

/** The subset of a training_blocks row the math needs. */
export type VliBlock = {
  kataId: string | null;
  split: Split | null;
  sections: number[] | null;
  reps: number | null;
  restRepSec: number | null;
  restSectionSec: number | null;
  rounds: number;
  minutes: number | null;
  skipped: boolean;
  actualReps: number | null;
};

export type Vli = { volume: number; load: number; intensity: number | null };

export type TimingLookup = (
  kataId: string,
  split: Split,
  index: number,
) => number | null;

export type MissingTiming = { kataId: string; split: Split; index: number };

type KataBlock = VliBlock & { kataId: string; split: Split; sections: number[] };

export function effectiveReps(b: VliBlock): number {
  return b.actualReps ?? b.reps ?? 0;
}

export function isKataBlock(b: VliBlock): b is KataBlock {
  return (
    b.kataId != null &&
    b.split != null &&
    Array.isArray(b.sections) &&
    b.sections.length > 0
  );
}

/** Volume = every performance of any section counts 1. */
export function blockVolume(b: VliBlock): number {
  if (!isKataBlock(b) || b.skipped) return 0;
  return effectiveReps(b) * b.rounds * b.sections.length;
}

/** Load = full-kata equivalents: volume scaled by section fraction. */
export function blockLoad(b: VliBlock): number {
  if (!isKataBlock(b) || b.skipped) return 0;
  return blockVolume(b) / SPLIT_SIZE[b.split];
}

// ponytail: additive heuristic over the manual's two lookup tables (section size,
// rest). Tune here only; every intensity number in the app flows through this.
export function blockIntensity(b: VliBlock): number | null {
  if (!isKataBlock(b)) return null;
  const rest = b.restRepSec ?? 999;
  let i = INTENSITY_WEIGHT[b.split];
  if (rest <= 30) i += 0.5;
  if (rest <= 10) i += 0.5;
  return Math.min(5, Math.max(1, i));
}

/** Session totals over kata blocks; skipped blocks drop out. */
export function sessionVli(blocks: VliBlock[]): Vli {
  let volume = 0;
  let load = 0;
  let weighted = 0;
  for (const b of blocks) {
    const v = blockVolume(b);
    if (v === 0) continue;
    volume += v;
    load += blockLoad(b);
    weighted += v * (blockIntensity(b) ?? 0);
  }
  const intensity =
    volume === 0 ? null : Math.round((weighted / volume) * 2) / 2;
  return { volume, load: Math.round(load * 100) / 100, intensity };
}

export function vliPerKata(blocks: VliBlock[]): Map<string, Vli> {
  const groups = new Map<string, VliBlock[]>();
  for (const b of blocks) {
    if (!isKataBlock(b)) continue;
    groups.set(b.kataId, [...(groups.get(b.kataId) ?? []), b]);
  }
  return new Map([...groups].map(([k, bs]) => [k, sessionVli(bs)]));
}

/**
 * Estimated seconds for one block. Kata block: per round, each section is
 * reps × section seconds + rest between reps; rest between sections and between
 * rounds uses restSectionSec. Missing timings make the block `null`.
 */
export function blockDurationSec(
  b: VliBlock,
  timing: TimingLookup,
): { seconds: number | null; missing: MissingTiming[] } {
  if (b.skipped) return { seconds: 0, missing: [] };
  if (!isKataBlock(b)) {
    return { seconds: b.minutes == null ? null : b.minutes * 60, missing: [] };
  }
  const reps = effectiveReps(b);
  const restRep = b.restRepSec ?? 0;
  const restSection = b.restSectionSec ?? 0;
  const missing: MissingTiming[] = [];
  let perRound = 0;
  for (const index of b.sections) {
    const sec = timing(b.kataId, b.split, index);
    if (sec == null) {
      missing.push({ kataId: b.kataId, split: b.split, index });
      continue;
    }
    perRound += reps * sec + Math.max(0, reps - 1) * restRep;
  }
  if (missing.length > 0) return { seconds: null, missing };
  perRound += Math.max(0, b.sections.length - 1) * restSection;
  return {
    seconds: b.rounds * perRound + Math.max(0, b.rounds - 1) * restSection,
    missing,
  };
}

export function sessionDurationSec(
  blocks: VliBlock[],
  timing: TimingLookup,
): { seconds: number | null; missing: MissingTiming[] } {
  let seconds: number | null = 0;
  const missing: MissingTiming[] = [];
  for (const b of blocks) {
    const r = blockDurationSec(b, timing);
    missing.push(...r.missing);
    if (r.seconds == null) seconds = null;
    else if (seconds != null) seconds += r.seconds;
  }
  return { seconds, missing };
}

/** Done = date passed (or today) and not skipped. Dates are YYYY-MM-DD strings. */
export function isSessionDone(
  s: { date: string; skippedAt: Date | null },
  today: string,
): boolean {
  return s.skippedAt == null && s.date <= today;
}

/** Monday (YYYY-MM-DD) of the ISO week containing `isoDate`. */
export function weekStartOf(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  const dow = (d.getUTCDay() + 6) % 7; // Mon = 0
  d.setUTCDate(d.getUTCDate() - dow);
  return d.toISOString().slice(0, 10);
}

/** YYYY-MM-DD, `days` after `isoDate`. */
export function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Today's date as YYYY-MM-DD (UTC). Sessions are date-only, so UTC is fine. */
export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
