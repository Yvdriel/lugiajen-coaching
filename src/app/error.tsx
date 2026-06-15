"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { nl } from "@/messages/nl";

/** Route-segment error boundary (convention 2: only genuine failures reach here). */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="font-heading text-2xl font-semibold">{nl.error.title}</h1>
      <p className="max-w-sm text-sm text-muted-foreground">{nl.error.body}</p>
      <Button onClick={reset}>{nl.error.retry}</Button>
    </div>
  );
}
