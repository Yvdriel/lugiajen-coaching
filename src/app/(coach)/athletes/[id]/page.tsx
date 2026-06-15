import Link from "next/link";
import { notFound } from "next/navigation";
import { AddNoteForm } from "@/components/athletes/add-note-form";
import { RotateLinkButton } from "@/components/athletes/rotate-link-button";
import { ShareLinkButton } from "@/components/athletes/share-link-button";
import { AthleteCompetitions } from "@/components/display/athlete-competitions";
import { AthleteHeader } from "@/components/display/athlete-header";
import { FeedbackList } from "@/components/display/feedback-list";
import {
  KataRepertoire,
  type KataRepertoireItem,
} from "@/components/display/kata-repertoire";
import { ScoringHistoryPanel } from "@/components/display/scoring-history-panel";
import { StatsOverview } from "@/components/display/stats-overview";
import { AssignKataForm } from "@/components/kata/assign-kata-form";
import { AthleteKataEditForm } from "@/components/kata/athlete-kata-edit-form";
import { RemoveKataButton } from "@/components/kata/remove-kata-button";
import { buttonVariants } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { buildAthleteStats } from "@/lib/athlete-stats";
import { calculateAge, getCategories } from "@/lib/categories";
import { getAthleteById, getAthleteNotes } from "@/lib/queries/athletes";
import { getAthleteCompetitions } from "@/lib/queries/competitions";
import { getFeedbackForms } from "@/lib/queries/feedback";
import {
  getAthleteKata,
  getKataLibrary,
  getUnassignedKata,
} from "@/lib/queries/kata";
import {
  getLatestCardsPerKata,
  getScoringHistory,
  getScoringSeriesByKata,
} from "@/lib/queries/scoring";
import { nl } from "@/messages/nl";

const TABS = [
  "overview",
  "kata",
  "scoring",
  "feedback",
  "competitions",
  "notes",
] as const;
type Tab = (typeof TABS)[number];

export default async function AthletePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; scoreKata?: string; editKata?: string }>;
}) {
  const { id } = await params;
  const { tab, scoreKata, editKata } = await searchParams;
  const a = await getAthleteById(id);
  if (!a) notFound();

  const activeTab: Tab = TABS.includes(tab as Tab) ? (tab as Tab) : "overview";

  const [
    notes,
    repertoire,
    unassigned,
    latestCards,
    seriesByKata,
    feedback,
    competitions,
    kataLib,
  ] = await Promise.all([
    getAthleteNotes(id),
    getAthleteKata(id),
    getUnassignedKata(id),
    getLatestCardsPerKata(id),
    getScoringSeriesByKata(id),
    getFeedbackForms(id),
    getAthleteCompetitions(id),
    getKataLibrary(),
  ]);
  const kataNames = new Map(kataLib.map((k) => [k.id, k.name]));

  // Overzicht stats — assembled from already-loaded rows (convention 4, no re-query).
  const stats = buildAthleteStats({
    competitions,
    repertoire,
    latestCards,
    feedback,
    kataNames,
  });

  const lastDateByKata = new Map(
    latestCards.map((c) => [c.kataId, c.assessmentDate]),
  );
  const kataItems: KataRepertoireItem[] = repertoire.map((item) => ({
    ...item,
    lastAssessmentDate: lastDateByKata.get(item.kataId) ?? null,
    trend: seriesByKata.get(item.kataId) ?? [],
  }));

  const editItem = editKata
    ? repertoire.find((r) => r.id === editKata) ?? null
    : null;

  // Scorekaarten tab: which kata's history to show.
  const repertoireKataIds = repertoire.map((r) => r.kataId);
  const selectedKataId =
    scoreKata && repertoireKataIds.includes(scoreKata)
      ? scoreKata
      : repertoireKataIds[0] ?? null;
  const history = selectedKataId
    ? await getScoringHistory(id, selectedKataId)
    : [];

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
            <RotateLinkButton athleteId={a.id} />
            <Link
              href={`/athletes/${a.id}/edit`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              {nl.common.edit}
            </Link>
          </>
        }
      />

      <Tabs defaultValue={activeTab}>
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
            stats={stats}
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
          <div className="flex flex-col gap-6">
            {editItem ? (
              <AthleteKataEditForm athleteId={a.id} item={editItem} />
            ) : null}
            <KataRepertoire
              items={kataItems}
              mode="coach"
              actions={(item) => (
                <>
                  <Link
                    href={`/athletes/${a.id}/kata/${item.kataId}/score`}
                    className={buttonVariants({ variant: "outline", size: "sm" })}
                  >
                    {nl.kata.assess}
                  </Link>
                  <Link
                    href={`/athletes/${a.id}?tab=kata&editKata=${item.id}`}
                    className={buttonVariants({ variant: "ghost", size: "sm" })}
                  >
                    {nl.kata.edit}
                  </Link>
                  <RemoveKataButton athleteId={a.id} id={item.id} />
                </>
              )}
            />
            <AssignKataForm
              athleteId={a.id}
              options={unassigned.map((k) => ({ id: k.id, name: k.name }))}
            />
          </div>
        </TabsContent>

        <TabsContent value="scoring" className="pt-4">
          {repertoire.length === 0 ? (
            <p className="text-sm text-muted-foreground">{nl.kata.empty}</p>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap gap-2">
                {repertoire.map((r) => (
                  <Link
                    key={r.kataId}
                    href={`/athletes/${a.id}?tab=scoring&scoreKata=${r.kataId}`}
                    className={buttonVariants({
                      variant: r.kataId === selectedKataId ? "default" : "outline",
                      size: "sm",
                    })}
                  >
                    {r.kataName}
                  </Link>
                ))}
              </div>

              {selectedKataId ? (
                <div className="flex flex-col gap-6">
                  <div>
                    <Link
                      href={`/athletes/${a.id}/kata/${selectedKataId}/score`}
                      className={buttonVariants({ size: "sm" })}
                    >
                      {nl.scoring.newCard}
                    </Link>
                  </div>

                  <ScoringHistoryPanel history={history} />
                </div>
              ) : null}
            </div>
          )}
        </TabsContent>

        <TabsContent value="feedback" className="pt-4">
          <div className="flex flex-col gap-4">
            <div>
              <Link
                href={`/athletes/${a.id}/feedback/new`}
                className={buttonVariants({ size: "sm" })}
              >
                {nl.feedback.new}
              </Link>
            </div>
            <FeedbackList
              items={feedback}
              actions={(item) => (
                <Link
                  href={`/athletes/${a.id}/feedback/${item.id}`}
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  {nl.feedback.view}
                </Link>
              )}
            />
          </div>
        </TabsContent>
        <TabsContent value="competitions" className="pt-4">
          <AthleteCompetitions rows={competitions} kataNames={kataNames} />
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
