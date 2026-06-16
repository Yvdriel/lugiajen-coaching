"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useMessages } from "@/i18n/client";

/** Parent-injected affordance (not part of the pure display header). */
export function ShareLinkButton({ token }: { token: string }) {
  const nl = useMessages();
  const [copied, setCopied] = useState(false);

  async function copy() {
    const url = `${window.location.origin}/athlete/view/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt(nl.athlete.copyPrompt, url);
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={copy}>
      {copied ? nl.athlete.linkCopied : nl.athlete.shareLink}
    </Button>
  );
}
