import { notFound } from "next/navigation";
import { SessionPage } from "@/components/training/session-page";
import { trainingWrite } from "@/features/training/actions";
import { withVli } from "@/features/training/context";
import { todayIso, weekStartOf } from "@/features/training/vli";
import { planWeekOf } from "@/features/training/week-view";
import { getAthleteById } from "@/lib/queries/athletes";
import { getActivePlan, getSessionById, getTimingLookup } from "@/lib/queries/training";

export default async function CoachSessionPage({
  params,
}: {
  params: Promise<{ id: string; sessionId: string }>;
}) {
  const { id, sessionId } = await params;
  const a = await getAthleteById(id);
  if (!a) notFound();
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
        session={withVli(row, timing, today)}
        planWeek={planWeekOf(plan, weekStartOf(row.date))}
        today={today}
        basePath={`/athletes/${a.id}/training`}
        mode="coach"
        action={trainingWrite}
      />
    </div>
  );
}
