import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AthleteCompetitions } from "@/components/display/athlete-competitions";
import { AthleteHeader } from "@/components/display/athlete-header";
import { FeedbackDetail } from "@/components/display/feedback-detail";
import {
  KataRepertoire,
  type KataRepertoireItem,
} from "@/components/display/kata-repertoire";
import { ScoringHistoryPanel } from "@/components/display/scoring-history-panel";
import { StatsOverview } from "@/components/display/stats-overview";
import { buttonVariants } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { buildAthleteStats } from "@/lib/athlete-stats";
import { calculateAge, getCategories } from "@/lib/categories";
import { getAthleteByViewToken } from "@/lib/queries/athletes";
import { getAthleteCompetitions } from "@/lib/queries/competitions";
import { getFeedbackForms } from "@/lib/queries/feedback";
import { getAthleteKata, getKataLibrary } from "@/lib/queries/kata";
import {
  getLatestCardsPerKata,
  getScoringHistory,
  getScoringSeriesByKata,
} from "@/lib/queries/scoring";
import { nl } from "@/messages/nl";

// ISR — the portal is read-only; a short window keeps it fresh after edits.
export const revalidate = 300;

const TABS = [
  "overview",
  "kata",
  "scoring",
  "feedback",
  "competitions",
] as const;
type Tab = (typeof TABS)[number];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const a = await getAthleteByViewToken(token);
  const title = a
    ? `${nl.portal.title} — ${a.firstName} ${a.lastName}`
    : nl.portal.title;
  // Never index the portal; never follow links out of it.
  return { title, robots: { index: false, follow: false } };
}

export default async function PortalPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ tab?: string; scoreKata?: string }>;
}) {
  const { token } = await params;
  const { tab, scoreKata } = await searchParams;
  const a = await getAthleteByViewToken(token);
  if (!a) notFound();

  const activeTab: Tab = TABS.includes(tab as Tab) ? (tab as Tab) : "overview";

  const [repertoire, latestCards, seriesByKata, feedback, competitions, kataLib] =
    await Promise.all([
      getAthleteKata(a.id),
      getLatestCardsPerKata(a.id),
      getScoringSeriesByKata(a.id),
      getFeedbackForms(a.id),
      getAthleteCompetitions(a.id),
      getKataLibrary(),
    ]);
  const kataNames = new Map(kataLib.map((k) => [k.id, k.name]));

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

  // Scorekaarten: which kata's history to show (same selection as the coach page).
  const repertoireKataIds = repertoire.map((r) => r.kataId);
  const selectedKataId =
    scoreKata && repertoireKataIds.includes(scoreKata)
      ? scoreKata
      : repertoireKataIds[0] ?? null;
  const history = selectedKataId
    ? await getScoringHistory(a.id, selectedKataId)
    : [];

  const age = calculateAge(new Date(a.dateOfBirth));
  const categories = getCategories(new Date(a.dateOfBirth));
  const t = nl.athlete.tabs;
  const base = `/athlete/view/${token}`;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 p-6 md:p-8">
      <div className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {nl.portal.title}
        </p>
        <AthleteHeader
          firstName={a.firstName}
          lastName={a.lastName}
          age={age}
          categories={categories}
          beltRank={a.beltRank}
          isActive={a.isActive}
          mode="public"
        />
      </div>

      <Tabs defaultValue={activeTab}>
        <TabsList>
          <TabsTrigger value="overview">{t.overview}</TabsTrigger>
          <TabsTrigger value="kata">{t.kata}</TabsTrigger>
          <TabsTrigger value="scoring">{t.scoringCards}</TabsTrigger>
          <TabsTrigger value="feedback">{t.feedback}</TabsTrigger>
          <TabsTrigger value="competitions">{t.competitions}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="pt-4">
          <StatsOverview
            stats={stats}
            physical={{
              heightCm: a.heightCm,
              weightKg: a.weightKg,
              physicalNotes: a.physicalNotes,
            }}
            mode="public"
          />
        </TabsContent>

        <TabsContent value="kata" className="pt-4">
          <KataRepertoire items={kataItems} mode="public" />
        </TabsContent>

        <TabsContent value="scoring" className="pt-4">
          {repertoire.length === 0 ? (
            <p className="text-sm text-muted-foreground">{nl.kata.empty}</p>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap gap-2">
                {repertoire.map((r) => (
                  // Plain <a> (not <Link>): full navigation, no prefetch — keeps
                  // the rate-limited portal from being hammered by prefetches.
                  <a
                    key={r.kataId}
                    href={`${base}?tab=scoring&scoreKata=${r.kataId}`}
                    className={buttonVariants({
                      variant:
                        r.kataId === selectedKataId ? "default" : "outline",
                      size: "sm",
                    })}
                  >
                    {r.kataName}
                  </a>
                ))}
              </div>
              {selectedKataId ? (
                <ScoringHistoryPanel history={history} />
              ) : null}
            </div>
          )}
        </TabsContent>

        <TabsContent value="feedback" className="pt-4">
          {feedback.length === 0 ? (
            <p className="text-sm text-muted-foreground">{nl.feedback.empty}</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {feedback.map((form) => (
                <li key={form.id} className="rounded-lg border border-border">
                  {/* Native disclosure — read-only expand, no client JS, no links. */}
                  <details>
                    <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 p-4 text-sm">
                      <span>
                        {new Date(form.meetingDate).toLocaleDateString("nl-NL")}
                        {" · "}
                        {nl.feedback.meeting} {form.meetingNumber}
                        {" · "}
                        {form.formType}
                      </span>
                      <span className="text-muted-foreground">
                        {form.season}
                      </span>
                    </summary>
                    <div className="border-t border-border p-4">
                      <FeedbackDetail form={form} />
                    </div>
                  </details>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="competitions" className="pt-4">
          <AthleteCompetitions
            rows={competitions}
            kataNames={kataNames}
            mode="public"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
