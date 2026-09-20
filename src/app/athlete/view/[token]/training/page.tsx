import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PortalBlocked } from "@/components/display/portal-blocked";
import { TrainingPage } from "@/components/training/training-page";
import { buttonVariants } from "@/components/ui/button";
import { isPortalBlocked } from "@/features/athletes/consent";
import { loadTrainingPage } from "@/features/training/page-data";
import { getMessages } from "@/i18n/server";
import { getAthleteByViewToken } from "@/lib/queries/athletes";

// Athlete writes land here (skip, actual reps, notes), so no ISR.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const nl = await getMessages();
  return { title: `${nl.portal.title} — ${nl.athlete.training.title}`, robots: { index: false, follow: false } };
}

export default async function PortalTrainingPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ view?: string; week?: string }>;
}) {
  const nl = await getMessages();
  const { token } = await params;
  const q = await searchParams;
  const a = await getAthleteByViewToken(token);
  if (!a) notFound();
  if (isPortalBlocked(a)) return <PortalBlocked />;
  const data = await loadTrainingPage(a.id, q, "public");
  const basePath = `/athlete/view/${token}/training`;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4 p-4 md:p-8">
      <div className="print-hide flex items-center gap-3">
        <Link href={`/athlete/view/${token}?tab=training`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
          ‹ {nl.common.back}
        </Link>
        <h1 className="font-heading text-xl font-semibold">{nl.athlete.training.title}</h1>
      </div>
      <TrainingPage athleteId={a.id} data={data} basePath={basePath} mode="public" />
    </div>
  );
}
