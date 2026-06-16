import Link from "next/link";
import { notFound } from "next/navigation";
import { FeedbackDetail } from "@/components/display/feedback-detail";
import { FeedbackFormU12 } from "@/components/forms/feedback-form-u12";
import { FeedbackFormU16 } from "@/components/forms/feedback-form-u16";
import { buttonVariants } from "@/components/ui/button";
import { updateFeedback } from "@/features/feedback/actions";
import { feedbackToValues } from "@/features/feedback/values";
import { getAthleteById } from "@/lib/queries/athletes";
import { getFeedbackById } from "@/lib/queries/feedback";
import { getMessages } from "@/i18n/server";

export default async function FeedbackDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; feedbackId: string }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  const nl = await getMessages();
  const { id, feedbackId } = await params;
  const { edit } = await searchParams;
  const [a, form] = await Promise.all([
    getAthleteById(id),
    getFeedbackById(feedbackId),
  ]);
  if (!a || !form || form.athleteId !== a.id) notFound();

  const editing = edit === "1";
  const props = {
    athleteId: a.id,
    feedbackId: form.id,
    defaultValues: feedbackToValues(form),
    action: updateFeedback,
    submitLabel: nl.common.save,
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-6 md:p-8">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Link
            href={`/athletes/${a.id}?tab=feedback`}
            className={`${buttonVariants({ variant: "ghost", size: "sm" })} w-fit px-0`}
          >
            ← {a.firstName} {a.lastName}
          </Link>
          <h1 className="font-heading text-2xl font-semibold">
            {editing ? nl.feedback.edit : nl.feedback.title}
          </h1>
        </div>
        {!editing ? (
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

      {editing ? (
        form.formType === "U12" ? (
          <FeedbackFormU12 {...props} />
        ) : (
          <FeedbackFormU16 {...props} />
        )
      ) : (
        <FeedbackDetail form={form} />
      )}
    </div>
  );
}
