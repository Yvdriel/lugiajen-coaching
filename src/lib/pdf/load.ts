import { buildAthleteStats } from "@/lib/athlete-stats";
import { calculateAge, getCategories, type Category } from "@/lib/categories";
import type { getAthleteById } from "@/lib/queries/athletes";
import { getAthleteCompetitions } from "@/lib/queries/competitions";
import {
  getFeedbackActionItems,
  getFeedbackForms,
} from "@/lib/queries/feedback";
import { getAthleteKata, getKataLibrary } from "@/lib/queries/kata";
import { getLatestCardsPerKata } from "@/lib/queries/scoring";

export type AthleteRow = NonNullable<Awaited<ReturnType<typeof getAthleteById>>>;

/**
 * Assemble the one-pager's derived data from an athlete row — the same rows the
 * profile page loads, fed through the shared `buildAthleteStats` (convention 4).
 * Shared by the coach + public one-pager PDF routes.
 */
export async function loadOnePager(athlete: AthleteRow): Promise<{
  age: number;
  categories: Category[];
  stats: ReturnType<typeof buildAthleteStats>;
}> {
  const [repertoire, latestCards, feedback, competitions, kataLib] =
    await Promise.all([
      getAthleteKata(athlete.id),
      getLatestCardsPerKata(athlete.id),
      getFeedbackForms(athlete.id),
      getAthleteCompetitions(athlete.id),
      getKataLibrary(),
    ]);
  const kataNames = new Map(kataLib.map((k) => [k.id, k.name]));
  const latestActions = (
    await getFeedbackActionItems(feedback[0]?.id ?? "")
  ).map((it) => it.text);
  const stats = buildAthleteStats({
    competitions,
    repertoire,
    latestCards,
    feedback,
    kataNames,
    latestActions,
  });
  const dob = new Date(athlete.dateOfBirth);
  return { age: calculateAge(dob), categories: getCategories(dob), stats };
}
