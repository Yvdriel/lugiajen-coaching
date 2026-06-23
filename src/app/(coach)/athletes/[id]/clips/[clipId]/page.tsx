import Link from "next/link";
import { notFound } from "next/navigation";
import { ClipDownloadButton } from "@/components/clips/clip-download-button";
import { ClipUploadDialog } from "@/components/clips/clip-upload-dialog";
import { DeleteClipButton } from "@/components/clips/delete-clip-button";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { syncClipStatus } from "@/features/clips/actions";
import { getSignedPlaybackToken, iframeUrl } from "@/features/clips/lib/stream";
import { getAthleteById } from "@/lib/queries/athletes";
import {
  type AthleteClipRow,
  getClipById,
  getDerivedClips,
} from "@/lib/queries/clips";
import { getAthleteKata } from "@/lib/queries/kata";
import { formatDate } from "@/i18n/format";
import { getLocale, getMessages } from "@/i18n/server";

function statusVariant(
  status: AthleteClipRow["status"],
): "default" | "secondary" | "outline" | "destructive" {
  if (status === "ready") return "outline";
  if (status === "error") return "destructive";
  return "secondary";
}

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
  const sourceId = clip.derivedFromClipId;
  const isDerived = sourceId != null;

  // Short-lived signed token, minted server-side per request. Never a public URL.
  // A source clip also gathers its derived analyses + the repertoire for the
  // "upload analysis" dialog; a derived clip resolves its source for the back-link.
  const [token, source, derived, repertoire] = await Promise.all([
    isReady
      ? getSignedPlaybackToken(clip.assetId, { expSeconds: 3600 })
      : Promise.resolve(null),
    isDerived ? getClipById(sourceId) : Promise.resolve(null),
    isDerived
      ? Promise.resolve([] as AthleteClipRow[])
      : getDerivedClips(clip.id),
    isDerived ? Promise.resolve([]) : getAthleteKata(a.id),
  ]);
  const kataOptions = repertoire.map((r) => ({ id: r.kataId, name: r.kataName }));

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
          {source ? (
            <Link
              href={`/athletes/${a.id}/clips/${source.id}`}
              className={`${buttonVariants({ variant: "ghost", size: "sm" })} w-fit px-0`}
            >
              ← {c.derivedFrom}: {source.label ?? c.kind[source.kind]}
            </Link>
          ) : null}
          <div className="flex items-center gap-2">
            <h1 className="font-heading text-2xl font-semibold">
              {clip.label ?? c.kind[clip.kind]}
            </h1>
            <Badge variant={isReady ? "outline" : "secondary"}>
              {c.status[clip.status]}
            </Badge>
            {clip.kind !== "raw" ? (
              <Badge variant="secondary">{c.kind[clip.kind]}</Badge>
            ) : null}
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

      {/* Kinovea round-trip: only a raw/source clip can be downloaded and have
          analyses attached. Derived clips just link back to their source. */}
      {!isDerived ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-start gap-3">
            {isReady ? <ClipDownloadButton clipId={clip.id} /> : null}
            <ClipUploadDialog
              athleteId={a.id}
              kataOptions={kataOptions}
              derivedFromClipId={clip.id}
              defaultKataId={clip.kataId ?? undefined}
            />
          </div>

          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold">{c.derivedClips}</h2>
            {derived.length === 0 ? (
              <p className="text-sm text-muted-foreground">{c.noDerivedClips}</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {derived.map((d) => (
                  <li
                    key={d.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border p-3"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {d.label ?? c.kind[d.kind]}
                      </span>
                      <Badge variant="secondary">{c.kind[d.kind]}</Badge>
                      <Badge variant={statusVariant(d.status)}>
                        {c.status[d.status]}
                      </Badge>
                    </div>
                    <Link
                      href={`/athletes/${a.id}/clips/${d.id}`}
                      className={buttonVariants({
                        variant: "outline",
                        size: "sm",
                      })}
                    >
                      {c.view}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}
