import { signedIframeUrl } from "@/features/clips/lib/playback";
import { getAthleteClips } from "@/lib/queries/clips";
import { getFeedbackClips } from "@/lib/queries/feedback";
import { getMessages } from "@/i18n/server";
import {
  type AvailableClip,
  FeedbackReelEditor,
} from "./feedback-reel-editor";
import { ReelPlayer, type ReelPlayerClip } from "./reel-player";

// Coach reel surface on a feedback gesprek. Server component — it mints the
// per-clip signed tokens (this page is session-guarded) and hands them to the pure
// player. The attach/reorder editor is shown ONLY before the meeting (`editable`);
// during the meeting and after it, the reel is play-only.
export async function FeedbackReelSection({
  feedbackId,
  athleteId,
  editable,
}: {
  feedbackId: string;
  athleteId: string;
  editable: boolean;
}) {
  const nl = await getMessages();
  const reel = await getFeedbackClips(feedbackId);

  // Coach sees every reel clip (a still-processing one shows a placeholder).
  const playerClips: ReelPlayerClip[] = await Promise.all(
    reel.map(async (c) => ({
      clipId: c.clipId,
      caption: c.caption,
      label: c.label,
      kataName: c.kataName,
      iframeUrl: await signedIframeUrl(c.assetId, c.status),
    })),
  );

  // Once the meeting has started, the reel is locked. With nothing to play either,
  // there is nothing to show.
  if (!editable && playerClips.length === 0) return null;

  let available: AvailableClip[] = [];
  if (editable) {
    const allClips = await getAthleteClips(athleteId);
    const attached = new Set(reel.map((row) => row.clipId));
    available = allClips
      .filter((c) => c.status === "ready" && !attached.has(c.id))
      .map((c) => ({
        id: c.id,
        label: c.label,
        kataName: c.kataName,
        kind: c.kind,
      }));
  }

  return (
    <section className="flex flex-col gap-4 border-t border-border pt-6">
      <h2 className="text-sm font-semibold">{nl.feedback.reel.title}</h2>
      {playerClips.length > 0 ? <ReelPlayer clips={playerClips} /> : null}
      {editable ? (
        <FeedbackReelEditor
          feedbackId={feedbackId}
          reel={reel}
          available={available}
        />
      ) : null}
    </section>
  );
}
