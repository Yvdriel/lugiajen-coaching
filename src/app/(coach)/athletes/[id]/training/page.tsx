import Link from "next/link";
import { notFound } from "next/navigation";
import { TrainingPage } from "@/components/training/training-page";
import { buttonVariants } from "@/components/ui/button";
import { loadTrainingPage } from "@/features/training/page-data";
import { getMessages } from "@/i18n/server";
import { getAthleteById } from "@/lib/queries/athletes";

export default async function CoachTrainingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ view?: string; week?: string }>;
}) {
  const nl = await getMessages();
  const { id } = await params;
  const q = await searchParams;
  const a = await getAthleteById(id);
  if (!a) notFound();
  const data = await loadTrainingPage(a.id, q, "coach");
  const basePath = `/athletes/${a.id}/training`;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4 p-4 md:p-8">
      <div className="print-hide flex items-center gap-3">
        <Link href={`/athletes/${a.id}?tab=training`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
          ‹ {nl.common.back}
        </Link>
        <h1 className="font-heading text-xl font-semibold">
          {a.firstName} {a.lastName} · {nl.athlete.training.title}
        </h1>
      </div>
      <TrainingPage athleteId={a.id} data={data} basePath={basePath} mode="coach" />
    </div>
  );
}
