"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useRef, useState } from "react";
import * as tus from "tus-js-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClipUpload, markClipUploaded } from "@/features/clips/actions";
import { useMessages } from "@/i18n/client";

type KataOption = { id: string; name: string };

// Cloudflare tus requires a chunk size that's a multiple of 256 KiB; 50 MB keeps
// uploads resumable on flaky dojo wifi.
const CHUNK_SIZE = 50 * 1024 * 1024;

export function ClipUploadDialog({
  athleteId,
  kataOptions,
}: {
  athleteId: string;
  kataOptions: KataOption[];
}) {
  const nl = useMessages();
  const c = nl.clips;
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const uploading = progress !== null;

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const file = fd.get("video");
    if (!(file instanceof File) || file.size === 0) {
      setError(c.uploadFailed);
      return;
    }

    setProgress(0);
    const created = await createClipUpload({
      athleteId,
      kataId: (fd.get("kataId") as string) || undefined,
      recordedAt: (fd.get("recordedAt") as string) || undefined,
      label: (fd.get("label") as string) || undefined,
    });
    if (!created.ok || !created.clipId) {
      setProgress(null);
      setError(created.message ?? c.uploadFailed);
      return;
    }
    const clipId = created.clipId;

    const upload = new tus.Upload(file, {
      endpoint: "/api/clips/tus",
      chunkSize: CHUNK_SIZE,
      removeFingerprintOnSuccess: true,
      metadata: {
        name: file.name,
        clipid: clipId,
        requiresignedurls: "",
        maxDurationSeconds: "300",
      },
      onError: () => {
        setProgress(null);
        setError(c.uploadFailed);
      },
      onProgress: (sent, total) => {
        setProgress(total ? Math.round((sent / total) * 100) : 0);
      },
      onSuccess: async () => {
        await markClipUploaded(clipId);
        setProgress(null);
        formRef.current?.reset();
        dialogRef.current?.close();
        router.refresh();
      },
    });
    upload.start();
  }

  return (
    <div className="flex flex-col gap-1">
      <Button
        type="button"
        size="sm"
        className="w-fit"
        onClick={() => dialogRef.current?.showModal()}
      >
        {c.upload}
      </Button>
      <dialog
        ref={dialogRef}
        className="fixed inset-0 m-auto h-fit w-96 max-w-[calc(100vw-2rem)] rounded-lg border border-border bg-background p-0 text-foreground shadow-lg backdrop:bg-black/40"
      >
        <form
          ref={formRef}
          onSubmit={onSubmit}
          className="flex flex-col gap-3 p-5"
        >
          <h2 className="text-sm font-semibold">{c.uploadTitle}</h2>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="clip-file">{c.file}</Label>
            <Input
              id="clip-file"
              name="video"
              type="file"
              accept="video/*"
              required
              disabled={uploading}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="clip-kata">{c.kata}</Label>
            <select
              id="clip-kata"
              name="kataId"
              disabled={uploading}
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
            >
              <option value="">{c.kataNone}</option>
              {kataOptions.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="clip-label">{c.label}</Label>
            <Input
              id="clip-label"
              name="label"
              type="text"
              placeholder={c.labelPlaceholder}
              disabled={uploading}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="clip-recorded">{c.recordedAt}</Label>
            <Input
              id="clip-recorded"
              name="recordedAt"
              type="date"
              disabled={uploading}
            />
          </div>

          {uploading ? (
            <div className="flex flex-col gap-1">
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-foreground transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {c.uploading} {progress}%
              </p>
            </div>
          ) : null}

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploading}
              onClick={() => dialogRef.current?.close()}
            >
              {nl.common.cancel}
            </Button>
            <Button type="submit" size="sm" disabled={uploading}>
              {c.upload}
            </Button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
