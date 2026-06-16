import { createElement } from "react";
import { getLocale, getMessages } from "@/i18n/server";
import {
  assertCoach,
  isUuid,
  pdfResponse,
  renderPdf,
  safeName,
} from "@/lib/pdf/http";
import { ScoringDocument } from "@/lib/pdf/scoring-document";
import { getAthleteById } from "@/lib/queries/athletes";
import { getKataLibrary } from "@/lib/queries/kata";
import { getScoringHistory } from "@/lib/queries/scoring";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; kataId: string }> },
) {
  const denied = await assertCoach();
  if (denied) return denied;

  const { id, kataId } = await params;
  if (!isUuid(kataId)) return new Response("Not found", { status: 404 });

  const athlete = await getAthleteById(id);
  if (!athlete) return new Response("Not found", { status: 404 });

  const [history, kataLib] = await Promise.all([
    getScoringHistory(athlete.id, kataId),
    getKataLibrary(),
  ]);
  const kataName = kataLib.find((k) => k.id === kataId)?.name ?? "?";

  const [m, locale] = await Promise.all([getMessages(), getLocale()]);
  const buffer = await renderPdf(
    createElement(ScoringDocument, { athlete, kataName, history, m, locale }),
  );
  return pdfResponse(
    buffer,
    `scorekaart-${safeName(athlete.lastName)}-${safeName(kataName)}.pdf`,
  );
}
