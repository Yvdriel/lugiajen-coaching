import Link from "next/link";
import { notFound } from "next/navigation";
import { AddNoteForm } from "@/components/athletes/add-note-form";
import { ShareLinkButton } from "@/components/athletes/share-link-button";
import { AthleteHeader } from "@/components/display/athlete-header";
import { StatsOverview } from "@/components/display/stats-overview";
import { buttonVariants } from "@/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { calculateAge, getCategories } from "@/lib/categories";
import { getAthleteById, getAthleteNotes } from "@/lib/queries/athletes";
import { nl } from "@/messages/nl";

export default async function AthletePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const a = await getAthleteById(id);
  if (!a) notFound();

  const notes = await getAthleteNotes(id);
  const age = calculateAge(new Date(a.dateOfBirth));
  const categories = getCategories(new Date(a.dateOfBirth));
  const t = nl.athlete.tabs;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 p-6 md:p-8">
      <AthleteHeader
        firstName={a.firstName}
        lastName={a.lastName}
        age={age}
        categories={categories}
        beltRank={a.beltRank}
        isActive={a.isActive}
        mode="coach"
        actions={
          <>
            <ShareLinkButton token={a.viewToken} />
            <Link
              href={`/athletes/${a.id}/edit`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              {nl.common.edit}
            </Link>
          </>
        }
      />

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">{t.overview}</TabsTrigger>
          <TabsTrigger value="kata">{t.kata}</TabsTrigger>
          <TabsTrigger value="scoring">{t.scoringCards}</TabsTrigger>
          <TabsTrigger value="feedback">{t.feedback}</TabsTrigger>
          <TabsTrigger value="competitions">{t.competitions}</TabsTrigger>
          <TabsTrigger value="notes">{t.notes}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="pt-4">
          <StatsOverview
            physical={{
              heightCm: a.heightCm,
              weightKg: a.weightKg,
              physicalNotes: a.physicalNotes,
            }}
            mode="coach"
          />
          {a.notes ? (
            <p className="mt-4 text-sm text-muted-foreground">{a.notes}</p>
          ) : null}
        </TabsContent>

        <TabsContent value="kata" className="pt-4">
          <Stub />
        </TabsContent>
        <TabsContent value="scoring" className="pt-4">
          <Stub />
        </TabsContent>
        <TabsContent value="feedback" className="pt-4">
          <Stub />
        </TabsContent>
        <TabsContent value="competitions" className="pt-4">
          <Stub />
        </TabsContent>

        <TabsContent value="notes" className="pt-4">
          <div className="flex flex-col gap-4">
            <AddNoteForm athleteId={a.id} />
            {notes.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {nl.athlete.notes.empty}
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {notes.map((n) => (
                  <li
                    key={n.id}
                    className="rounded-md border border-border p-3 text-sm"
                  >
                    <p className="whitespace-pre-wrap">{n.body}</p>
                    <time className="mt-1 block text-xs text-muted-foreground">
                      {n.createdAt.toLocaleString("nl-NL")}
                    </time>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Stub() {
  return (
    <p className="text-sm text-muted-foreground">{nl.athlete.comingSoon}</p>
  );
}
