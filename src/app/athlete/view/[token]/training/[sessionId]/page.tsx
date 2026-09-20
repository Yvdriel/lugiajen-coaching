import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PortalBlocked } from "@/components/display/portal-blocked";
import { SessionPage } from "@/components/training/session-page";
import { isPortalBlocked } from "@/features/athletes/consent";
import { portalTrainingWrite } from "@/features/training/actions";
import { forPortal, withVli } from "@/features/training/context";
import { todayIso, weekStartOf } from "@/features/training/vli";
import { planWeekOf } from "@/features/training/week-view";
import { getMessages } from "@/i18n/server";
import { getAthleteByViewToken } from "@/lib/queries/athletes";
import { getActivePlan, getSessionById, getTimingLookup } from "@/lib/queries/training";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const nl = await getMessages();
  return { title: `${nl.portal.title} — ${nl.athlete.training.title}`, robots: { index: false, follow: false } };
}

export default async function PortalSessionPage({
  params,
}: {
  params: Promise<{ token: string; sessionId: string }>;
}) {
  const { token, sessionId } = await params;
  const a = await getAthleteByViewToken(token);
  if (!a) notFound();
  if (isPortalBlocked(a)) return <PortalBlocked />;
  const row = await getSessionById(sessionId);
  if (!row || row.athleteId !== a.id) notFound();
  const today = todayIso();
  const [timing, plan] = await Promise.all([
    getTimingLookup(a.id),
    getActivePlan(a.id, row.date),
  ]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 p-4 md:p-8">
      <SessionPage
        athleteId={a.id}
        session={forPortal(withVli(row, timing, today))}
        planWeek={planWeekOf(plan, weekStartOf(row.date))}
        today={today}
        basePath={`/athlete/view/${token}/training`}
        mode="public"
        action={portalTrainingWrite.bind(null, token)}
      />
    </div>
  );
}
