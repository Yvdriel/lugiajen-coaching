"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export function NavUser({ name, email }: { name: string; email: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleSignOut() {
    setPending(true);
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="border-t border-border p-3">
      <div className="mb-2 px-1">
        <p className="truncate text-sm font-medium">{name}</p>
        <p className="truncate text-xs text-muted-foreground">{email}</p>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={handleSignOut}
        disabled={pending}
      >
        {pending ? "Bezig…" : "Uitloggen"}
      </Button>
    </div>
  );
}
