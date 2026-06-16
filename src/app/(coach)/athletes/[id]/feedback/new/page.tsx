import Link from "next/link";
import { notFound } from "next/navigation";
import { FeedbackFormCadet } from "@/components/forms/feedback-form-cadet";
import { FeedbackFormJunior } from "@/components/forms/feedback-form-junior";
import { FeedbackFormSenior } from "@/components/forms/feedback-form-senior";
import { FeedbackFormU12 } from "@/components/forms/feedback-form-u12";
import { buttonVariants } from "@/components/ui/button";
import { createFeedback } from "@/features/feedback/actions";
import {
  currentSeason,
  FORM_TYPES,
  isFormType,
  recommendedFormType,
} from "@/features/feedback/form-type";
import {
  blankFeedbackValues,
  kataRatingValues,
} from "@/features/feedback/values";
import { calculateAge } from "@/lib/categories";
import { getAthleteById } from "@/lib/queries/athletes";
import { getAthleteKata } from "@/lib/queries/kata";
import { getMessages } from "@/i18n/server";

export default async function NewFeedbackPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ type?: string }>;
}) {
  const nl = await getMessages();
  const { id } = await params;
  const { type } = await searchParams;
  const [a, kata] = await Promise.all([
    getAthleteById(id),
    getAthleteKata(id),
  ]);
  if (!a) notFound();

  const age = calculateAge(new Date(a.dateOfBirth));
  const formType = isFormType(type) ? type : recommendedFormType(age);
  const today = new Date().toISOString().slice(0, 10);
  const repertoire = kata.map((k) => ({ kataId: k.kataId, kataName: k.kataName }));
  const props = {
    athleteId: a.id,
    defaultValues: {
      ...blankFeedbackValues(today, currentSeason()),
      ...kataRatingValues(repertoire),
    },
    action: createFeedback,
    submitLabel: nl.feedback.save,
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-6 md:p-8">
      <div className="flex flex-col gap-2">
        <Link
          href={`/athletes/${a.id}?tab=feedback`}
          className={`${buttonVariants({ variant: "ghost", size: "sm" })} w-fit px-0`}
        >
          ← {a.firstName} {a.lastName}
        </Link>
        <h1 className="font-heading text-2xl font-semibold">
          {nl.feedback.new}
        </h1>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">{nl.feedback.template}:</span>
          {FORM_TYPES.map((t) => (
            <Link
              key={t}
              href={`/athletes/${a.id}/feedback/new?type=${t}`}
              className={buttonVariants({
                variant: formType === t ? "default" : "outline",
                size: "sm",
              })}
            >
              {t}
            </Link>
          ))}
        </div>
      </div>

      {formType === "U12" ? (
        <FeedbackFormU12 {...props} />
      ) : formType === "CADET" ? (
        <FeedbackFormCadet {...props} repertoire={repertoire} />
      ) : formType === "JUNIOR" ? (
        <FeedbackFormJunior {...props} repertoire={repertoire} />
      ) : (
        <FeedbackFormSenior {...props} repertoire={repertoire} />
      )}
    </div>
  );
}
