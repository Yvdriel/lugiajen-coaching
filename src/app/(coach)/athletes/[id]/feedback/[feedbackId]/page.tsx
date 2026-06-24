import Link from "next/link";
import { notFound } from "next/navigation";
import { AthleteAnswers } from "@/components/display/athlete-answers";
import { FeedbackDetail } from "@/components/display/feedback-detail";
import { FeedbackReelSection } from "@/components/clips/feedback-reel-section";
import { FeedbackFormCadet } from "@/components/forms/feedback-form-cadet";
import { FeedbackFormJunior } from "@/components/forms/feedback-form-junior";
import { FeedbackFormSenior } from "@/components/forms/feedback-form-senior";
import { FeedbackFormU12 } from "@/components/forms/feedback-form-u12";
import {
  DeleteDraftButton,
  PrepareLinkButton,
  SendPrepareLinkButton,
} from "@/components/forms/prepare-link-actions";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { resolveRecipient } from "@/features/athletes/consent";
import { completeFeedback, updateFeedback } from "@/features/feedback/actions";
import { isReelEditable } from "@/features/feedback/reel-order";
import {
  feedbackToValues,
  kataRatingValues,
} from "@/features/feedback/values";
import { getAthleteById } from "@/lib/queries/athletes";
import {
  getFeedbackById,
  getFeedbackKataRatings,
} from "@/lib/queries/feedback";
import { getAthleteKata } from "@/lib/queries/kata";
import { formatDateTime } from "@/i18n/format";
import { getLocale, getMessages } from "@/i18n/server";

export default async function FeedbackDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; feedbackId: string }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  const nl = await getMessages();
  const locale = await getLocale();
  const { id, feedbackId } = await params;
  const { edit } = await searchParams;
  const [a, form, kata, kataRatings] = await Promise.all([
    getAthleteById(id),
    getFeedbackById(feedbackId),
    getAthleteKata(id),
    getFeedbackKataRatings(feedbackId),
  ]);
  if (!a || !form || form.athleteId !== a.id) notFound();

  const f = nl.feedback;
  // Can the prepare link be emailed? (consent gate + contact email on file)
  const recipient = resolveRecipient(a);
  const sendDisabledReason = recipient.ok
    ? undefined
    : recipient.reason === "consent"
      ? f.sendBlockedConsent
      : f.sendNoEmail;
  const isDraft = form.status === "awaiting_athlete";
  const isSubmitted = form.status === "athlete_submitted";
  const editing = edit === "1" && !isDraft;
  // The reel may be curated only before the meeting; during (editing) + after
  // (completed) it is play-only.
  const reelEditable = isReelEditable(form.status, editing);
  const repertoire = kata.map((k) => ({ kataId: k.kataId, kataName: k.kataName }));

  // Editing a submitted draft IS the in-person meeting: finalize via completeFeedback
  // and soft-lock the athlete's Side A. Editing a completed form is a plain update.
  const props = {
    athleteId: a.id,
    feedbackId: form.id,
    defaultValues: {
      ...feedbackToValues(form),
      ...kataRatingValues(repertoire, kataRatings),
    },
    action: isSubmitted ? completeFeedback : updateFeedback,
    submitLabel: isSubmitted ? f.complete : nl.common.save,
    lockSideA: isSubmitted,
  };

  const backLink = (
    <Link
      href={`/athletes/${a.id}?tab=feedback`}
      className={`${buttonVariants({ variant: "ghost", size: "sm" })} w-fit px-0`}
    >
      ← {a.firstName} {a.lastName}
    </Link>
  );

  const statusBadge = (
    <Badge variant={form.status === "completed" ? "outline" : "secondary"}>
      {f.status[form.status]}
    </Badge>
  );

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-6 md:p-8">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          {backLink}
          <div className="flex items-center gap-2">
            <h1 className="font-heading text-2xl font-semibold">
              {editing ? f.edit : f.title}
            </h1>
            {statusBadge}
          </div>
        </div>
        {form.status === "completed" && !editing ? (
          <div className="flex gap-2">
            <a
              href={`/api/athletes/${a.id}/feedback/${form.id}/pdf`}
              target="_blank"
              rel="noopener"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              {nl.common.pdf}
            </a>
            <Link
              href={`/athletes/${a.id}/feedback/${form.id}?edit=1`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              {nl.common.edit}
            </Link>
          </div>
        ) : null}
      </div>

      {isDraft ? (
        // Awaiting athlete — share link + open audit + cleanup. No form yet.
        <div className="flex flex-col gap-4 rounded-lg border border-border p-5">
          <p className="text-sm font-medium">{f.awaitingAthlete}</p>
          <dl className="flex flex-col gap-1 text-sm text-muted-foreground">
            <div className="flex gap-2">
              <dt>{f.openedAt}:</dt>
              <dd>
                {form.athleteOpenedAt
                  ? formatDateTime(form.athleteOpenedAt, locale)
                  : f.notOpenedYet}
              </dd>
            </div>
          </dl>
          <div className="flex flex-wrap items-start gap-2">
            {form.prepareToken ? (
              <PrepareLinkButton token={form.prepareToken} />
            ) : null}
            <SendPrepareLinkButton
              athleteId={a.id}
              feedbackId={form.id}
              alreadySent={form.lastReminderAt != null}
              disabledReason={sendDisabledReason}
            />
            <DeleteDraftButton athleteId={a.id} feedbackId={form.id} />
          </div>
        </div>
      ) : editing ? (
        form.formType === "U12" ? (
          <FeedbackFormU12 {...props} />
        ) : form.formType === "CADET" ? (
          <FeedbackFormCadet {...props} repertoire={repertoire} />
        ) : form.formType === "JUNIOR" ? (
          <FeedbackFormJunior {...props} repertoire={repertoire} />
        ) : (
          <FeedbackFormSenior {...props} repertoire={repertoire} />
        )
      ) : isSubmitted ? (
        // Athlete prepared — preview their answers + start the in-person meeting.
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-4">
            <div className="flex flex-col gap-0.5 text-sm">
              <span className="font-medium">{f.status.athlete_submitted}</span>
              {form.athleteSubmittedAt ? (
                <span className="text-muted-foreground">
                  {f.submittedAt}: {formatDateTime(form.athleteSubmittedAt, locale)}
                </span>
              ) : null}
            </div>
            <div className="flex gap-2">
              <Link
                href={`/athletes/${a.id}/feedback/${form.id}?edit=1`}
                className={buttonVariants({ size: "sm" })}
              >
                {f.startMeeting}
              </Link>
              <DeleteDraftButton athleteId={a.id} feedbackId={form.id} />
            </div>
          </div>
          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold">{f.sideA}</h2>
            <AthleteAnswers form={form} kataRatings={kataRatings} />
          </section>
        </div>
      ) : (
        <FeedbackDetail form={form} kataRatings={kataRatings} />
      )}

      {/* Clip reel — curate before the meeting; play-only during/after it. */}
      <FeedbackReelSection
        feedbackId={form.id}
        athleteId={a.id}
        editable={reelEditable}
      />
    </div>
  );
}
