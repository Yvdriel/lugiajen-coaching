import Link from "next/link";
import { notFound } from "next/navigation";
import { ScoringCardForm } from "@/components/forms/scoring-card-form";
import { buttonVariants } from "@/components/ui/button";
import { getAthleteById } from "@/lib/queries/athletes";
import { getAthleteKata } from "@/lib/queries/kata";
import { getLatestScoringCard } from "@/lib/queries/scoring";
import { nl } from "@/messages/nl";

export default async function ScoreKataPage({
  params,
}: {
  params: Promise<{ id: string; kataId: string }>;
}) {
  const { id, kataId } = await params;
  const athlete = await getAthleteById(id);
  if (!athlete) notFound();

  // Scoring is only allowed for kata in the athlete's repertoire.
  const repertoire = await getAthleteKata(id);
  const entry = repertoire.find((r) => r.kataId === kataId);
  if (!entry) notFound();

  const previousCard = await getLatestScoringCard(id, kataId);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-6 md:p-8">
      <div className="flex flex-col gap-1">
        <Link
          href={`/athletes/${id}?tab=kata`}
          className={`${buttonVariants({ variant: "ghost", size: "sm" })} w-fit px-0`}
        >
          ← {athlete.firstName} {athlete.lastName}
        </Link>
        <h1 className="font-heading text-2xl font-semibold">
          {nl.scoring.newCard}: {entry.kataName}
        </h1>
      </div>

      <ScoringCardForm
        athleteId={id}
        kataId={kataId}
        previousCard={previousCard}
        today={today}
      />
    </div>
  );
}
