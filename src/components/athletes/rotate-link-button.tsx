"use client";

import { useActionState } from "react";
import { rotateViewToken } from "@/features/athletes/actions";
import { Button } from "@/components/ui/button";
import { nl } from "@/messages/nl";

/**
 * Parent-injected affordance: rotates the athlete's public view-token, invalidating
 * the old share link. `revalidatePath` in the action refreshes the page so the
 * `ShareLinkButton` next to this one picks up the new token.
 */
export function RotateLinkButton({ athleteId }: { athleteId: string }) {
  const [, action, pending] = useActionState(rotateViewToken, { ok: false });

  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(nl.athlete.rotateConfirm)) e.preventDefault();
      }}
    >
      <input type="hidden" name="athleteId" value={athleteId} />
      <Button type="submit" variant="ghost" size="sm" disabled={pending}>
        {nl.athlete.rotateLink}
      </Button>
    </form>
  );
}
