import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { SessionWithVli } from "@/features/training/context";
import type { WeekVli } from "@/features/training/progress";
import { SPLIT_SIZE } from "@/features/training/vli";
import { formatDate } from "@/i18n/format";
import { getLocale, getMessages } from "@/i18n/server";
import type { BlockRow, PlanRow } from "@/lib/queries/training";

/**
 * Pure presentational training plan (convention 3): plan header, week targets vs
 * actual VLI, sessions grouped by week with one line per block. `mode="public"`
 * hides coachNotes on sessions and blocks. Learnings never come through here.
 */
export type TrainingPlanProps = {
  plan: PlanRow | null;
  weeks: WeekVli[];
  sessions: SessionWithVli[];
  targetCompetitionName?: string | null;
  mode?: "coach" | "public";
};

function fmtSec(sec: number | null): string {
  if (sec == null) return "—";
  return `${Math.round(sec / 60)}`;
}

function fmtRest(sec: number | null): string {
  if (sec == null) return "—";
  return sec >= 60 && sec % 60 === 0 ? `${sec / 60}min` : `${sec}s`;
}

function sectionsLabel(b: BlockRow): string {
  if (!b.split || !b.sections) return "";
  const size = SPLIT_SIZE[b.split];
  return b.sections.map((i) => `${i}/${size}`).join("-");
}

export async function TrainingPlan({
  plan,
  weeks,
  sessions,
  targetCompetitionName,
  mode = "coach",
}: TrainingPlanProps) {
  const nl = await getMessages();
  const locale = await getLocale();
  const t = nl.athlete.training;

  return (
    <div className="flex flex-col gap-6">
      {plan ? (
        <header className="flex flex-col gap-1">
          <h2 className="font-heading text-lg font-semibold">{plan.name}</h2>
          <p className="text-sm text-muted-foreground">
            {formatDate(plan.startDate, locale)} –{" "}
            {formatDate(plan.endDate, locale)}
            {targetCompetitionName
              ? ` · ${t.targetCompetition}: ${targetCompetitionName}`
              : null}
          </p>
          {plan.notes ? (
            <p className="max-w-prose whitespace-pre-wrap text-sm">
              {plan.notes}
            </p>
          ) : null}
        </header>
      ) : (
        <p className="text-sm text-muted-foreground">{t.noPlan}</p>
      )}

      {weeks.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t.week}</TableHead>
              <TableHead>{t.character}</TableHead>
              <TableHead className="text-right">
                {t.load} ({t.target}/{t.actual})
              </TableHead>
              <TableHead className="text-right">
                {t.intensity} ({t.target}/{t.actual})
              </TableHead>
              <TableHead className="text-right">{t.volume}</TableHead>
              <TableHead className="text-right">{t.sessions}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {weeks.map((w) => (
              <TableRow key={w.weekStart}>
                <TableCell>{formatDate(w.weekStart, locale)}</TableCell>
                <TableCell className="text-muted-foreground">
                  {w.target?.character ?? "—"}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {w.target?.targetLoad ?? "—"} / {w.total.load}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {w.target?.targetIntensity ?? "—"} /{" "}
                  {w.total.intensity ?? "—"}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {w.total.volume}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {w.sessionsDone} {t.done.toLowerCase()}
                  {w.sessionsSkipped
                    ? ` · ${w.sessionsSkipped} ${t.skipped.toLowerCase()}`
                    : ""}
                  {w.sessionsPlanned
                    ? ` · ${w.sessionsPlanned} ${t.planned.toLowerCase()}`
                    : ""}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : null}

      {sessions.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t.noSessions}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {sessions.map((s) => (
            <li
              key={s.id}
              className={`rounded-md border border-border p-3 text-sm ${
                s.skippedAt ? "opacity-60" : ""
              }`}
            >
              <details open={!s.done && !s.skippedAt}>
                <summary className="flex cursor-pointer flex-wrap items-center gap-2">
                  <span className="font-medium">
                    {formatDate(s.date, locale)}
                  </span>
                  {s.title ? <span>{s.title}</span> : null}
                  {s.skippedAt ? (
                    <Badge variant="outline">{t.skipped}</Badge>
                  ) : s.done ? (
                    <Badge variant="secondary">{t.done}</Badge>
                  ) : (
                    <Badge variant="outline">{t.planned}</Badge>
                  )}
                  <span className="ml-auto tabular-nums text-muted-foreground">
                    V {s.vli.volume} · L {s.vli.load} · I{" "}
                    {s.vli.intensity ?? "—"} · {fmtSec(s.durationSec)} {t.min}
                  </span>
                </summary>
                <ul className="mt-2 flex flex-col gap-1">
                  {s.blocks.map((b) => (
                    <li
                      key={b.id}
                      className={`flex flex-wrap items-baseline gap-x-2 ${
                        b.skipped ? "line-through opacity-60" : ""
                      }`}
                    >
                      <span className="w-14 shrink-0 text-xs text-muted-foreground">
                        {t.part} {b.part}
                      </span>
                      <span className="font-medium">
                        {b.kataName ?? b.label}
                      </span>
                      {b.kataId ? (
                        <span className="tabular-nums">
                          {sectionsLabel(b)} ×{b.actualReps ?? b.reps}
                          {b.rounds > 1 ? ` · ${b.rounds} ${t.rounds}` : ""}
                          {" | "}
                          {fmtRest(b.restRepSec)} / {fmtRest(b.restSectionSec)}
                          {b.vest ? ` · ${t.vest}` : ""}
                        </span>
                      ) : b.minutes ? (
                        <span className="tabular-nums">
                          {b.minutes} {t.min}
                        </span>
                      ) : null}
                      {b.notes ? (
                        <span className="text-muted-foreground">{b.notes}</span>
                      ) : null}
                      {mode === "coach" && b.coachNotes ? (
                        <span className="text-xs text-muted-foreground">
                          ({b.coachNotes})
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
                {s.notes ? (
                  <p className="mt-2 whitespace-pre-wrap text-muted-foreground">
                    {s.notes}
                  </p>
                ) : null}
                {mode === "coach" && s.coachNotes ? (
                  <p className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground">
                    {t.coachNotes}: {s.coachNotes}
                  </p>
                ) : null}
                {mode === "coach" && s.missingTimings.length > 0 ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t.missingTimings}{" "}
                    {s.missingTimings
                      .map(
                        (m) =>
                          `${s.blocks.find((b) => b.kataId === m.kataId)?.kataName ?? "?"} ${m.index}/${SPLIT_SIZE[m.split]}`,
                      )
                      .join(", ")}
                  </p>
                ) : null}
              </details>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
