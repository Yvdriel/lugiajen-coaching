"use client";

import { Button } from "@/components/ui/button";
import { useMessages } from "@/i18n/client";

export function PrintButton() {
  const t = useMessages().athlete.training;
  return (
    <Button type="button" variant="ghost" size="sm" className="print-hide" onClick={() => window.print()}>
      {t.print}
    </Button>
  );
}
