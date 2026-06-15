import Link from "next/link";
import { notFound } from "next/navigation";
import { FeedbackFormU12 } from "@/components/forms/feedback-form-u12";
import { FeedbackFormU16 } from "@/components/forms/feedback-form-u16";
import { buttonVariants } from "@/components/ui/button";
import { createFeedback } from "@/features/feedback/actions";
import {
  currentSeason,
  isFormType,
  recommendedFormType,
} from "@/features/feedback/form-type";
import { blankFeedbackValues } from "@/features/feedback/values";
import { calculateAge } from "@/lib/categories";
import { getAthleteById } from "@/lib/queries/athletes";
import { nl } from "@/messages/nl";

export default async function NewFeedbackPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ type?: string }>;
}) {
  const { id } = await params;
  const { type } = await searchParams;
  const a = await getAthleteById(id);
  if (!a) notFound();

  const age = calculateAge(new Date(a.dateOfBirth));
  const formType = isFormType(type) ? type : recommendedFormType(age);
  const today = new Date().toISOString().slice(0, 10);
  const props = {
    athleteId: a.id,
    defaultValues: blankFeedbackValues(today, currentSeason()),
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
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">{nl.feedback.template}:</span>
          <Link
            href={`/athletes/${a.id}/feedback/new?type=U12`}
            className={buttonVariants({
              variant: formType === "U12" ? "default" : "outline",
              size: "sm",
            })}
          >
            U12
          </Link>
          <Link
            href={`/athletes/${a.id}/feedback/new?type=U16`}
            className={buttonVariants({
              variant: formType === "U16" ? "default" : "outline",
              size: "sm",
            })}
          >
            U16
          </Link>
        </div>
      </div>

      {formType === "U12" ? (
        <FeedbackFormU12 {...props} />
      ) : (
        <FeedbackFormU16 {...props} />
      )}
    </div>
  );
}
