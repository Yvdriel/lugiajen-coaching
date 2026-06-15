// Pure derivation for the athlete Wedstrijden-tab summary (and Ch9 reuse). Operates
// on already-resolved kata names per entry so it stays testable without the DB.

export type CompetitionSummaryInput = {
  placement: number | null;
  katas: string[]; // resolved kata names performed across this entry's rounds
};

export type CompetitionSummary = {
  totalEvents: number;
  podium: { first: number; second: number; third: number };
  mostKata: string | null;
};

export function summarizeAthleteCompetitions(
  entries: CompetitionSummaryInput[],
): CompetitionSummary {
  const podium = { first: 0, second: 0, third: 0 };
  const kataCount = new Map<string, number>();

  for (const e of entries) {
    if (e.placement === 1) podium.first++;
    else if (e.placement === 2) podium.second++;
    else if (e.placement === 3) podium.third++;
    for (const name of e.katas) {
      kataCount.set(name, (kataCount.get(name) ?? 0) + 1);
    }
  }

  // Most-performed kata; ties resolve to the first encountered (insertion order).
  let mostKata: string | null = null;
  let max = 0;
  for (const [name, n] of kataCount) {
    if (n > max) {
      max = n;
      mostKata = name;
    }
  }

  return { totalEvents: entries.length, podium, mostKata };
}
