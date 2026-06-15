import Link from "next/link";
import { CompetitionWizard } from "@/components/competition/competition-wizard";
import { buttonVariants } from "@/components/ui/button";
import { getActiveAthletesWithRepertoire } from "@/lib/queries/competitions";
import { nl } from "@/messages/nl";

export default async function NewCompetitionPage() {
  const athletes = await getActiveAthletesWithRepertoire();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-6 md:p-8">
      <div className="flex flex-col gap-2">
        <Link
          href="/competitions"
          className={`${buttonVariants({ variant: "ghost", size: "sm" })} w-fit px-0`}
        >
          ← {nl.competition.title}
        </Link>
        <h1 className="font-heading text-2xl font-semibold">
          {nl.competition.new}
        </h1>
      </div>

      <CompetitionWizard athletes={athletes} />
    </div>
  );
}
