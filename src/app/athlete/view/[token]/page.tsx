import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AthleteAnswers } from "@/components/display/athlete-answers";
import { AthleteCompetitions } from "@/components/display/athlete-competitions";
import { AthleteHeader } from "@/components/display/athlete-header";
import { FeedbackDetail } from "@/components/display/feedback-detail";
import { PortalBlocked } from "@/components/display/portal-blocked";
import {
  KataRepertoire,
  type KataRepertoireItem,
} from "@/components/display/kata-repertoire";
import { ScoringHistoryPanel } from "@/components/display/scoring-history-panel";
import { StatsOverview } from "@/components/display/stats-overview";
import {
  ReelPlayer,
  type ReelPlayerClip,
} from "@/components/clips/reel-player";
import { buttonVariants } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { isPortalBlocked } from "@/features/athletes/consent";
import { signedIframeUrl } from "@/features/clips/lib/playback";
import { playableReelClips } from "@/features/feedback/reel-order";
import { buildAthleteStats } from "@/lib/athlete-stats";
import { calculateAge, getCategories } from "@/lib/categories";
import { getAthleteByViewToken } from "@/lib/queries/athletes";
import { getAthleteCompetitions } from "@/lib/queries/competitions";
import {
  getCompletedFeedbackForms,
  getFeedbackClipsByFeedbackIds,
  getFeedbackKataRatingsByAthlete,
  getPendingPrepareForm,
} from "@/lib/queries/feedback";
import { getAthleteKata, getKataLibrary } from "@/lib/queries/kata";
import {
  getLatestCardsPerKata,
  getScoringHistory,
  getScoringSeriesByKata,
} from "@/lib/queries/scoring";
import { formatDate } from "@/i18n/format";
import { getLocale, getMessages } from "@/i18n/server";

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
  const nl = await getMessages();
  const a = await getAthleteByViewToken(token);
  // Don't leak a blocked minor's name in the tab title.
  const title =
    a && !isPortalBlocked(a)
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
  const nl = await getMessages();
  const locale = await getLocale();
  const a = await getAthleteByViewToken(token);
  if (!a) notFound();
  // AVG/GDPR: under-16 without recorded parental consent → no data shown.
  if (isPortalBlocked(a)) return <PortalBlocked />;

  const activeTab: Tab = TABS.includes(tab as Tab) ? (tab as Tab) : "overview";

  const [
    repertoire,
    latestCards,
    seriesByKata,
    feedback,
    competitions,
    kataLib,
    feedbackKataRatings,
    pendingPrepare,
  ] = await Promise.all([
    getAthleteKata(a.id),
    getLatestCardsPerKata(a.id),
    getScoringSeriesByKata(a.id),
    getCompletedFeedbackForms(a.id),
    getAthleteCompetitions(a.id),
    getKataLibrary(),
    getFeedbackKataRatingsByAthlete(a.id),
    getPendingPrepareForm(a.id),
  ]);
  const kataNames = new Map(kataLib.map((k) => [k.id, k.name]));

  // Parent-meeting reels for completed gesprekken. Tokens are minted server-side;
  // the page is already consent-gated (isPortalBlocked above), so reel playback
  // rides that same gate — no separate per-video check (decision 2026-06-24).
  const reelsByForm = await getFeedbackClipsByFeedbackIds(
    feedback.map((f) => f.id),
  );
  const reelPlayers = new Map<string, ReelPlayerClip[]>();
  for (const f of feedback) {
    const ready = playableReelClips(reelsByForm.get(f.id) ?? []);
    if (ready.length === 0) continue;
    reelPlayers.set(
      f.id,
      await Promise.all(
        ready.map(async (c) => ({
          clipId: c.clipId,
          caption: c.caption,
          label: c.label,
          kataName: c.kataName,
          iframeUrl: await signedIframeUrl(c.assetId, c.status),
        })),
      ),
    );
  }

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
          <div className="mb-4 flex justify-end">
            <a
              href={`/api/athlete/view/${token}/pdf`}
              target="_blank"
              rel="noopener"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              {nl.common.downloadPdf}
            </a>
          </div>
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
          {pendingPrepare ? (
            <div className="mb-4 rounded-lg border border-border p-4">
              {pendingPrepare.status === "awaiting_athlete" ? (
                // Plain <a> (no prefetch) — same convention as the scoring tab.
                <a
                  href={`/feedback/prepare/${pendingPrepare.prepareToken}`}
                  className="flex flex-wrap items-center justify-between gap-2"
                >
                  <span className="text-sm font-medium">
                    {nl.portal.prepareCta}
                  </span>
                  <span
                    className={buttonVariants({
                      variant: "default",
                      size: "sm",
                    })}
                  >
                    {nl.portal.prepareOpen}
                  </span>
                </a>
              ) : (
                <details>
                  <summary className="cursor-pointer text-sm font-medium">
                    {nl.portal.preparePending}
                  </summary>
                  <div className="border-t border-border pt-4 mt-4">
                    <AthleteAnswers
                      form={pendingPrepare}
                      kataRatings={feedbackKataRatings.get(pendingPrepare.id) ?? []}
                    />
                  </div>
                </details>
              )}
            </div>
          ) : null}

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
                        {formatDate(form.meetingDate, locale)}
                        {" · "}
                        {nl.feedback.meeting} {form.meetingNumber}
                        {" · "}
                        {form.formType}
                      </span>
                      <span className="text-muted-foreground">
                        {form.season}
                      </span>
                    </summary>
                    <div className="flex flex-col gap-4 border-t border-border p-4">
                      <FeedbackDetail
                        form={form}
                        kataRatings={feedbackKataRatings.get(form.id) ?? []}
                      />
                      {reelPlayers.get(form.id) ? (
                        <section className="flex flex-col gap-3 border-t border-border pt-4">
                          <h3 className="text-sm font-semibold">
                            {nl.feedback.reel.title}
                          </h3>
                          <ReelPlayer clips={reelPlayers.get(form.id) ?? []} />
                        </section>
                      ) : null}
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
