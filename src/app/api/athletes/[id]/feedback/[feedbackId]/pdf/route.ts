import { createElement } from "react";
import { getLocale, getMessages } from "@/i18n/server";
import { FeedbackDocument } from "@/lib/pdf/feedback-document";
import { assertCoach, pdfResponse, renderPdf, safeName } from "@/lib/pdf/http";
import { getAthleteById } from "@/lib/queries/athletes";
import { getFeedbackById } from "@/lib/queries/feedback";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; feedbackId: string }> },
) {
  const denied = await assertCoach();
  if (denied) return denied;

  const { id, feedbackId } = await params;
  const [athlete, form] = await Promise.all([
    getAthleteById(id),
    getFeedbackById(feedbackId),
  ]);
  if (!athlete || !form || form.athleteId !== athlete.id) {
    return new Response("Not found", { status: 404 });
  }

  const [m, locale] = await Promise.all([getMessages(), getLocale()]);
  const buffer = await renderPdf(
    createElement(FeedbackDocument, { athlete, form, m, locale }),
  );
  return pdfResponse(
    buffer,
    `feedback-${safeName(athlete.lastName)}-${form.meetingDate}.pdf`,
  );
}
