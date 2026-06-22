import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteClipButton } from "@/components/clips/delete-clip-button";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { syncClipStatus } from "@/features/clips/actions";
import { getSignedPlaybackToken, iframeUrl } from "@/features/clips/lib/stream";
import { getAthleteById } from "@/lib/queries/athletes";
import { getClipById } from "@/lib/queries/clips";
import { formatDate } from "@/i18n/format";
import { getLocale, getMessages } from "@/i18n/server";

export default async function ClipDetailPage({
  params,
}: {
  params: Promise<{ id: string; clipId: string }>;
}) {
  const nl = await getMessages();
  const locale = await getLocale();
  const { id, clipId } = await params;
  const [a, clip] = await Promise.all([
    getAthleteById(id),
    getClipById(clipId),
  ]);
  if (!a || !clip || clip.athleteId !== a.id) notFound();

  const c = nl.clips;
  const isReady = clip.status === "ready";
  // Short-lived signed token, minted server-side per request. Never a public URL.
  const token = isReady
    ? await getSignedPlaybackToken(clip.assetId, { expSeconds: 3600 })
    : null;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-6 md:p-8">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Link
            href={`/athletes/${a.id}?tab=clips`}
            className={`${buttonVariants({ variant: "ghost", size: "sm" })} w-fit px-0`}
          >
            ← {a.firstName} {a.lastName}
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="font-heading text-2xl font-semibold">
              {clip.label ?? c.kind[clip.kind]}
            </h1>
            <Badge variant={isReady ? "outline" : "secondary"}>
              {c.status[clip.status]}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {clip.kataName ? `${clip.kataName} · ` : ""}
            {formatDate(clip.recordedAt ?? clip.createdAt, locale)}
          </p>
        </div>
        <DeleteClipButton clipId={clip.id} />
      </div>

      {isReady && token ? (
        <div className="aspect-video w-full overflow-hidden rounded-lg border border-border bg-black">
          <iframe
            src={iframeUrl(token)}
            title={clip.label ?? c.title}
            className="h-full w-full"
            allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
            allowFullScreen
          />
        </div>
      ) : (
        <div className="flex flex-col items-start gap-3 rounded-lg border border-border p-6">
          <p className="text-sm text-muted-foreground">
            {clip.status === "error" ? c.uploadFailed : c.processingHint}
          </p>
          <form action={syncClipStatus.bind(null, clip.id)}>
            <button
              type="submit"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              {c.syncStatus}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
