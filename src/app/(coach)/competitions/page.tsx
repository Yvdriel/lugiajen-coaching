import Link from "next/link";
import { CompetitionList } from "@/components/display/competition-list";
import { buttonVariants } from "@/components/ui/button";
import { getCompetitionsList } from "@/lib/queries/competitions";
import { nl } from "@/messages/nl";

export default async function CompetitionsPage() {
  const items = await getCompetitionsList();

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 p-6 md:p-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-heading text-2xl font-semibold">
          {nl.competition.title}
        </h1>
        <Link href="/competitions/new" className={buttonVariants()}>
          {nl.competition.new}
        </Link>
      </header>

      <CompetitionList
        items={items}
        actions={(it) => (
          <Link
            href={`/competitions/${it.id}`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            {nl.feedback.view}
          </Link>
        )}
      />
    </div>
  );
}
