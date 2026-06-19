import { createElement } from "react";
import { isPortalBlocked } from "@/features/athletes/consent";
import { getMessages } from "@/i18n/server";
import { AthleteDocument } from "@/lib/pdf/athlete-document";
import { pdfResponse, renderPdf, safeName } from "@/lib/pdf/http";
import { loadOnePager } from "@/lib/pdf/load";
import { getAthleteByViewToken } from "@/lib/queries/athletes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public one-pager — validates the view_token (no session). Mirrors the portal's
// mode="public": physical notes are omitted.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const athlete = await getAthleteByViewToken(token);
  // 404 on miss OR on a consent-blocked minor (mirror the portal gate).
  if (!athlete || isPortalBlocked(athlete)) {
    return new Response("Not found", { status: 404 });
  }

  const [{ age, categories, stats }, m] = await Promise.all([
    loadOnePager(athlete),
    getMessages(),
  ]);
  const buffer = await renderPdf(
    createElement(AthleteDocument, {
      athlete,
      age,
      categories,
      stats,
      m,
      includePhysicalNotes: false, // public — no physical notes
    }),
  );
  return pdfResponse(buffer, `overzicht-${safeName(athlete.lastName)}.pdf`);
}
