import { createElement } from "react";
import {
  loadMeetingCompetitions,
  type MeetingCompetition,
} from "@/features/feedback/competitions";
import { showsCompetitionSection } from "@/features/feedback/form-type";
import { getLocale, getMessages } from "@/i18n/server";
import { FeedbackDocument } from "@/lib/pdf/feedback-document";
import { assertCoach, pdfResponse, renderPdf, safeName } from "@/lib/pdf/http";
import { getAthleteById } from "@/lib/queries/athletes";
import {
  getFeedbackActionItems,
  getFeedbackById,
  getFeedbackGoals,
  getFeedbackKataRatings,
} from "@/lib/queries/feedback";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; feedbackId: string }> },
) {
  const denied = await assertCoach();
  if (denied) return denied;

  const { id, feedbackId } = await params;
  const [athlete, form, kataRatings, goals, actions] = await Promise.all([
    getAthleteById(id),
    getFeedbackById(feedbackId),
    getFeedbackKataRatings(feedbackId),
    getFeedbackGoals(feedbackId),
    getFeedbackActionItems(feedbackId),
  ]);
  if (!athlete || !form || form.athleteId !== athlete.id) {
    return new Response("Not found", { status: 404 });
  }
  // A draft has no coach content yet — no PDF until the gesprek is completed.
  if (form.status !== "completed") {
    return new Response("Not available", { status: 404 });
  }

  // Competition section (CADET+): coach feedback paired with the athlete's reflection.
  const competitions: MeetingCompetition[] = showsCompetitionSection(
    form.formType,
  )
    ? await loadMeetingCompetitions({
        id: form.id,
        athleteId: form.athleteId,
        meetingDate: form.meetingDate,
        createdAt: form.createdAt,
      })
    : [];

  const [m, locale] = await Promise.all([getMessages(), getLocale()]);
  const buffer = await renderPdf(
    createElement(FeedbackDocument, {
      athlete,
      form,
      kataRatings,
      goals,
      actions,
      competitions,
      m,
      locale,
    }),
  );
  return pdfResponse(
    buffer,
    `feedback-${safeName(athlete.lastName)}-${form.meetingDate}.pdf`,
  );
}
