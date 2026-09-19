import { addDays, weekStartOf } from "./vli";

// Deterministic 6-week table (03-periodization-framework) scaled by the per-age caps
// in 01-vli-reference-manual §7. Output plugs straight into create_plan.weeks.

type BaseWeek = { load: number; intensity: number; character: string };

// Index 0 = six weeks out … index 5 = competition week.
const BASE: BaseWeek[] = [
  { load: 10, intensity: 1.5, character: "Loading / Building" },
  { load: 8, intensity: 3.5, character: "Building with intensity" },
  { load: 7, intensity: 3.5, character: "Transmutation + vest" },
  { load: 6, intensity: 4, character: "Peak training load" },
  { load: 5, intensity: 4.5, character: "Taper" },
  { load: 2, intensity: 5, character: "Competition week" },
];

/** Load and intensity ceilings per age (VLI manual §7). */
export function ageCaps(age: number): { load: number; intensity: number } {
  if (age < 12) return { load: 5, intensity: 3 };
  if (age < 15) return { load: 7, intensity: 3.5 };
  if (age < 18) return { load: 9, intensity: 5 };
  return { load: 10, intensity: 5 };
}

export type SuggestedWeek = {
  weekStart: string;
  targetLoad: number;
  targetIntensity: number;
  character: string;
  weeksOut: number;
};

/**
 * Weeks leading to `competitionDate`, closest-to-competition rows kept when fewer
 * than six are requested. Competition week = the ISO week containing the date.
 */
export function suggestPlanWeeks(args: {
  competitionDate: string;
  age: number;
  weeks?: number;
}): SuggestedWeek[] {
  const n = Math.min(6, Math.max(1, args.weeks ?? 6));
  const caps = ageCaps(args.age);
  const compWeek = weekStartOf(args.competitionDate);
  const rows = BASE.slice(6 - n);
  return rows.map((w, i) => {
    const weeksOut = n - 1 - i;
    return {
      weekStart: addDays(compWeek, -7 * weeksOut),
      targetLoad: Math.min(w.load, caps.load),
      targetIntensity: Math.min(w.intensity, caps.intensity),
      character: w.character,
      weeksOut,
    };
  });
}
