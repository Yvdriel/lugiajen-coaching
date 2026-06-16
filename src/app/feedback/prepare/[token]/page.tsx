import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AthleteAnswers } from "@/components/display/athlete-answers";
import { AthletePrepForm } from "@/components/forms/athlete-prep-form";
import {
  markPrepareOpened,
  submitAthletePreparation,
} from "@/features/feedback/actions";
import {
  feedbackToValues,
  kataRatingValues,
} from "@/features/feedback/values";
import { getAthleteById } from "@/lib/queries/athletes";
import {
  getFeedbackByPrepareToken,
  getFeedbackKataRatings,
} from "@/lib/queries/feedback";
import { getAthleteKata } from "@/lib/queries/kata";
import { getMessages } from "@/i18n/server";

// Dynamic (no ISR) so markPrepareOpened runs on every real visit and the status
// branch reflects the latest state. Never indexed (the token lives in the URL).
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function PreparePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const nl = await getMessages();

  const form = await getFeedbackByPrepareToken(token);
  if (!form) {
    return (
      <main className="mx-auto max-w-3xl p-6 md:p-8">
        <p className="text-sm text-muted-foreground">{nl.prepare.notFound}</p>
      </main>
    );
  }

  const athlete = await getAthleteById(form.athleteId);
  if (!athlete) notFound();

  // First-open audit (set-once; safe to call regardless of status).
  await markPrepareOpened(token);

  const heading = (
    <div className="flex flex-col gap-1">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {athlete.firstName} {athlete.lastName}
      </p>
      <h1 className="font-heading text-2xl font-semibold">
        {nl.prepare.title}
      </h1>
    </div>
  );

  // Already met — the coach finished this gesprek; the link is spent.
  if (form.status === "completed") {
    return (
      <main className="mx-auto flex max-w-3xl flex-col gap-4 p-6 md:p-8">
        {heading}
        <p className="text-sm text-muted-foreground">{nl.prepare.alreadyDone}</p>
      </main>
    );
  }

  // Already submitted — one-shot: show their answers read-only (no re-edit).
  if (form.status === "athlete_submitted") {
    const kataRatings = await getFeedbackKataRatings(form.id);
    return (
      <main className="mx-auto flex max-w-3xl flex-col gap-6 p-6 md:p-8">
        {heading}
        <div className="rounded-lg border border-border bg-muted/40 p-4">
          <p className="text-sm font-medium">{nl.prepare.submitted}</p>
          <p className="text-sm text-muted-foreground">
            {nl.prepare.submittedHint}
          </p>
        </div>
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold">{nl.prepare.yourAnswers}</h2>
          <AthleteAnswers form={form} kataRatings={kataRatings} />
        </section>
      </main>
    );
  }

  // awaiting_athlete — the editable Side A form.
  const repertoire = (await getAthleteKata(form.athleteId)).map((k) => ({
    kataId: k.kataId,
    kataName: k.kataName,
  }));

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 p-6 md:p-8">
      {heading}
      <p className="text-sm text-muted-foreground">{nl.prepare.intro}</p>
      <AthletePrepForm
        formType={form.formType}
        repertoire={repertoire}
        defaultValues={{
          ...feedbackToValues(form),
          ...kataRatingValues(repertoire),
        }}
        action={submitAthletePreparation.bind(null, token)}
      />
    </main>
  );
}
