"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { deleteClip } from "@/features/clips/actions";
import { useMessages } from "@/i18n/client";

export function DeleteClipButton({ clipId }: { clipId: string }) {
  const nl = useMessages();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => {
        if (window.confirm(nl.clips.confirmDelete)) {
          startTransition(() => {
            void deleteClip(clipId);
          });
        }
      }}
    >
      {nl.clips.delete}
    </Button>
  );
}
