import Link from "next/link";
import { ClipUploadDialog } from "@/components/clips/clip-upload-dialog";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { syncClipStatus } from "@/features/clips/actions";
import type { AthleteClipRow } from "@/lib/queries/clips";
import { formatDate } from "@/i18n/format";
import { getLocale, getMessages } from "@/i18n/server";

type ClipStatus = AthleteClipRow["status"];

function statusVariant(
  status: ClipStatus,
): "default" | "secondary" | "outline" | "destructive" {
  if (status === "ready") return "outline";
  if (status === "error") return "destructive";
  return "secondary";
}

export async function ClipsTab({
  athleteId,
  clips,
  kataOptions,
}: {
  athleteId: string;
  clips: AthleteClipRow[];
  kataOptions: { id: string; name: string }[];
}) {
  const nl = await getMessages();
  const locale = await getLocale();
  const c = nl.clips;

  return (
    <div className="flex flex-col gap-4">
      <ClipUploadDialog athleteId={athleteId} kataOptions={kataOptions} />

      {clips.length === 0 ? (
        <p className="text-sm text-muted-foreground">{c.empty}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {clips.map((clip) => (
            <li
              key={clip.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border p-3"
            >
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {clip.label ?? c.kind[clip.kind]}
                  </span>
                  <Badge variant={statusVariant(clip.status)}>
                    {c.status[clip.status]}
                  </Badge>
                  {clip.kind !== "raw" ? (
                    <Badge variant="secondary">{c.kind[clip.kind]}</Badge>
                  ) : null}
                </div>
                <span className="text-xs text-muted-foreground">
                  {clip.kataName ? `${clip.kataName} · ` : ""}
                  {formatDate(clip.recordedAt ?? clip.createdAt, locale)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {clip.status !== "ready" ? (
                  <form action={syncClipStatus.bind(null, clip.id)}>
                    <button
                      type="submit"
                      className={buttonVariants({
                        variant: "ghost",
                        size: "sm",
                      })}
                    >
                      {c.syncStatus}
                    </button>
                  </form>
                ) : null}
                <Link
                  href={`/athletes/${athleteId}/clips/${clip.id}`}
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  {c.view}
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
