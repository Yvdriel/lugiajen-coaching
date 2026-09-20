import Link from "next/link";
import { AgendaList } from "@/components/training/agenda-list";
import { KataProgressChart } from "@/components/training/kata-progress-chart";
import { LoadStrip } from "@/components/training/load-strip";
import { PrintButton } from "@/components/training/print-button";
import { TimingPivot } from "@/components/training/timing-pivot";
import { WeekNav } from "@/components/training/week-nav";
import { WeekView } from "@/components/training/week-view";
import type { TrainingPageData, TrainingView } from "@/features/training/page-data";
import { getMessages } from "@/i18n/server";
import { cn } from "@/lib/utils";

/** Body shared by the coach and portal training routes: view switcher + one view. */
export async function TrainingPage({
  athleteId,
  data,
  basePath,
  mode,
}: {
  athleteId: string;
  data: TrainingPageData;
  basePath: string;
  mode: "coach" | "public";
}) {
  const nl = await getMessages();
  const t = nl.athlete.training;
  const hrefFor = (id: string) => `${basePath}/${id}`;
  const views: TrainingView[] = ["week", "agenda", "progress"];

  return (
    <div data-training className="flex flex-col gap-5">
      <nav className="print-hide flex items-center justify-between gap-2">
        <div className="inline-flex rounded-lg bg-muted p-[3px]">
          {views.map((v) => (
            <Link
              key={v}
              href={`${basePath}?view=${v}${v === "week" ? `&week=${data.weekStart}` : ""}`}
              className={cn(
                "rounded-md px-3 py-1 text-sm font-medium",
                data.view === v ? "bg-background shadow-sm" : "text-muted-foreground",
              )}
            >
              {t.views[v]}
            </Link>
          ))}
        </div>
        {data.view === "week" ? <PrintButton /> : null}
      </nav>

      {data.view === "week" ? (
        <>
          <WeekNav basePath={basePath} weekStart={data.weekStart} today={data.today} />
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {data.plan
              ? `${data.plan.name}${data.planWeek ? ` · ${t.planWeek} ${data.planWeek.index} · ${data.planWeek.character}` : ""}`
              : t.noPlan}
          </p>
          <div className="print-hide">
            <LoadStrip weeks={data.strip} weekStart={data.weekStart} />
          </div>
          <WeekView grid={data.grid} planWeek={data.planWeek} today={data.today} mode={mode} basePath={basePath} />
        </>
      ) : null}

      {data.view === "agenda" && data.agenda ? (
        <AgendaList upcoming={data.agenda.upcoming} past={data.agenda.past} hrefFor={hrefFor} />
      ) : null}

      {data.view === "progress" && data.progress ? (
        <div className="flex flex-col gap-8">
          <section className="flex flex-col gap-4">
            <h2 className="font-heading text-base font-semibold">{t.progress.loadPerWeek}</h2>
            {data.progress.kata.map((k) => (
              <KataProgressChart key={k.kataId} kata={k} />
            ))}
          </section>
          <TimingPivot
            athleteId={athleteId}
            repertoire={data.progress.repertoire.map((r) => ({ kataId: r.kataId, kataName: r.kataName, splits: r.splits }))}
            timings={data.progress.timings}
            mode={mode}
          />
        </div>
      ) : null}
    </div>
  );
}
