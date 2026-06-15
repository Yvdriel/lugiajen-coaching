import Link from "next/link";
import { notFound } from "next/navigation";
import { AddAthletesForm } from "@/components/competition/add-athletes-form";
import { RemoveCompetitionButton } from "@/components/competition/remove-competition-button";
import { RemoveEntryButton } from "@/components/competition/remove-entry-button";
import { CompetitionEntries } from "@/components/display/competition-entries";
import { CompetitionEntryForm } from "@/components/forms/competition-entry-form";
import { CompetitionForm } from "@/components/forms/competition-form";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { updateCompetition } from "@/features/competitions/actions";
import { entryToValues } from "@/features/competitions/values";
import {
  getAthletesNotInCompetition,
  getCompetitionById,
  getCompetitionEntries,
} from "@/lib/queries/competitions";
import { getAthleteKata, getKataLibrary } from "@/lib/queries/kata";
import { nl } from "@/messages/nl";

export default async function CompetitionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ edit?: string; entry?: string }>;
}) {
  const { id } = await params;
  const { edit, entry } = await searchParams;
  const comp = await getCompetitionById(id);
  if (!comp) notFound();

  const [entries, kataLib, notInComp] = await Promise.all([
    getCompetitionEntries(comp.id),
    getKataLibrary(),
    getAthletesNotInCompetition(comp.id),
  ]);
  const kataNames = new Map(kataLib.map((k) => [k.id, k.name]));

  const editing = edit === "1";
  const editEntryRow = entry
    ? entries.find((e) => e.entry.id === entry) ?? null
    : null;

  // Kata options for the entry editor: that athlete's competition repertoire
  // (fallback to full repertoire) so the per-round selects are never empty.
  let kataOptions: { kataId: string; kataName: string }[] = [];
  if (editEntryRow) {
    const rep = await getAthleteKata(editEntryRow.entry.athleteId);
    const compRep = rep.filter((r) => r.isCompetitionKata);
    kataOptions = (compRep.length > 0 ? compRep : rep).map((r) => ({
      kataId: r.kataId,
      kataName: r.kataName,
    }));
  }

  const c = nl.competition;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 p-6 md:p-8">
      <div className="flex flex-col gap-2">
        <Link
          href="/competitions"
          className={`${buttonVariants({ variant: "ghost", size: "sm" })} w-fit px-0`}
        >
          ← {c.title}
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="font-heading text-2xl font-semibold">{comp.name}</h1>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="outline">{c.types[comp.competitionType]}</Badge>
              <span>{new Date(comp.date).toLocaleDateString("nl-NL")}</span>
              {comp.location ? (
                <>
                  <span aria-hidden>·</span>
                  <span>{comp.location}</span>
                </>
              ) : null}
            </div>
          </div>
          {!editing ? (
            <div className="flex gap-1">
              <Link
                href={`/competitions/${comp.id}?edit=1`}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                {nl.common.edit}
              </Link>
              <RemoveCompetitionButton id={comp.id} />
            </div>
          ) : null}
        </div>
      </div>

      {editing ? (
        <CompetitionForm
          action={updateCompetition}
          competitionId={comp.id}
          submitLabel={nl.common.save}
          cancelHref={`/competitions/${comp.id}`}
          defaultValues={{
            name: comp.name,
            date: comp.date,
            competitionType: comp.competitionType,
            location: comp.location ?? "",
            notes: comp.notes ?? "",
          }}
        />
      ) : editEntryRow ? (
        <CompetitionEntryForm
          competitionId={comp.id}
          athleteId={editEntryRow.entry.athleteId}
          entryId={editEntryRow.entry.id}
          athleteName={`${editEntryRow.athleteFirstName} ${editEntryRow.athleteLastName}`}
          defaultValues={entryToValues(editEntryRow.entry)}
          kataOptions={kataOptions}
        />
      ) : (
        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-3">
            <h2 className="font-heading text-lg font-medium">{c.entries}</h2>
            <CompetitionEntries
              entries={entries}
              kataNames={kataNames}
              actions={(row) => (
                <>
                  <Link
                    href={`/competitions/${comp.id}?entry=${row.entry.id}`}
                    className={buttonVariants({ variant: "outline", size: "sm" })}
                  >
                    {nl.common.edit}
                  </Link>
                  <RemoveEntryButton
                    id={row.entry.id}
                    competitionId={comp.id}
                    athleteId={row.entry.athleteId}
                  />
                </>
              )}
            />
          </section>
          <AddAthletesForm competitionId={comp.id} athletes={notInComp} />
        </div>
      )}
    </div>
  );
}
