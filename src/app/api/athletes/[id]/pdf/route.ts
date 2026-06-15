import { createElement } from "react";
import { AthleteDocument } from "@/lib/pdf/athlete-document";
import { assertCoach, pdfResponse, renderPdf, safeName } from "@/lib/pdf/http";
import { loadOnePager } from "@/lib/pdf/load";
import { getAthleteById } from "@/lib/queries/athletes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await assertCoach();
  if (denied) return denied;

  const { id } = await params;
  const athlete = await getAthleteById(id);
  if (!athlete) return new Response("Not found", { status: 404 });

  const { age, categories, stats } = await loadOnePager(athlete);
  const buffer = await renderPdf(
    createElement(AthleteDocument, {
      athlete,
      age,
      categories,
      stats,
      includePhysicalNotes: true, // coach view
    }),
  );
  return pdfResponse(buffer, `overzicht-${safeName(athlete.lastName)}.pdf`);
}
