import Link from "next/link";
import { SessionDetail } from "@/components/training/session-detail";
import {
  ActualReps,
  AthleteNotesForm,
  SkipToggle,
  type TrainingAction,
} from "@/components/training/session-controls";
import { buttonVariants } from "@/components/ui/button";
import { type SessionWithVli } from "@/features/training/context";
import { isKataBlock, weekStartOf } from "@/features/training/vli";
import { getMessages } from "@/i18n/server";

/** Session detail body shared by coach and portal; the caller binds the action. */
export async function SessionPage({
  athleteId,
  session,
  planWeek,
  today,
  basePath,
  mode,
  action,
}: {
  athleteId: string;
  session: SessionWithVli;
  planWeek: { index: number; character: string } | null;
  today: string;
  basePath: string;
  mode: "coach" | "public";
  action: TrainingAction;
}) {
  const nl = await getMessages();
  return (
    <div data-training className="flex flex-col gap-4">
      <Link
        href={`${basePath}?view=week&week=${weekStartOf(session.date)}`}
        className={`${buttonVariants({ variant: "ghost", size: "sm" })} print-hide self-start`}
      >
        ‹ {nl.common.back}
      </Link>
      <SessionDetail
        session={session}
        planWeek={planWeek}
        today={today}
        mode={mode}
        sessionControls={
          <SkipToggle action={action} athleteId={athleteId} kind="session" id={session.id} skipped={session.skippedAt != null} />
        }
        blockControls={(b) => (
          <>
            <SkipToggle action={action} athleteId={athleteId} kind="block" id={b.id} skipped={b.skipped} />
            {isKataBlock(b) && b.reps != null ? (
              <ActualReps action={action} athleteId={athleteId} blockId={b.id} planned={b.reps} actual={b.actualReps} />
            ) : null}
          </>
        )}
        notesForm={
          <AthleteNotesForm action={action} athleteId={athleteId} sessionId={session.id} value={session.athleteNotes} />
        }
      />
    </div>
  );
}
