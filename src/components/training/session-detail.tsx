import type { ReactNode } from "react";
import { BlockLine } from "@/components/training/block-line";
import { DayHeader } from "@/components/training/day-header";
import { Badge } from "@/components/ui/badge";
import type { SessionWithVli } from "@/features/training/context";
import { SPLIT_SIZE } from "@/features/training/vli";
import { getMessages } from "@/i18n/server";
import type { BlockRow } from "@/lib/queries/training";

/**
 * One session: dark day header, VLI totals, a card per part with every block in
 * sheet notation. Controls come in as slots so coach and portal bind their own
 * actions. coachNotes only in coach mode (convention 3).
 */
export async function SessionDetail({
  session: s,
  planWeek,
  today,
  mode,
  sessionControls,
  blockControls,
  notesForm,
}: {
  session: SessionWithVli;
  planWeek: { index: number; character: string } | null;
  today: string;
  mode: "coach" | "public";
  sessionControls?: ReactNode;
  blockControls?: (b: BlockRow) => ReactNode;
  notesForm?: ReactNode;
}) {
  const nl = await getMessages();
  const t = nl.athlete.training;
  const parts = [...new Set(s.blocks.map((b) => b.part))].sort((a, b) => a - b);
  const kataNames = new Map<string, string>();
  for (const b of s.blocks) if (b.kataId && b.kataName) kataNames.set(b.kataId, b.kataName);

  return (
    <div className="flex flex-col gap-4">
      <DayHeader date={s.date} sessions={[s]} planWeek={planWeek} today={today} />

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <p className="tabular-nums">
          <span className="font-semibold">{t.volume}</span> {s.vli.volume} ·{" "}
          <span className="font-semibold">{t.load}</span> {s.vli.load} ·{" "}
          <span className="font-semibold">{t.intensity}</span> {s.vli.intensity ?? "—"} ·{" "}
          <span className="font-semibold">{t.duration}</span>{" "}
          {s.durationSec == null ? "—" : `${Math.round(s.durationSec / 60)} ${t.min}`}
        </p>
        {sessionControls}
      </div>

      {s.missingTimings.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          {t.missingTimings}{" "}
          {[...new Set(s.missingTimings.map((m) => `${kataNames.get(m.kataId) ?? m.kataId} ${m.index}/${SPLIT_SIZE[m.split]}`))].join(", ")}
        </p>
      ) : null}

      {s.notes ? <p className="max-w-prose whitespace-pre-wrap text-sm">{s.notes}</p> : null}

      {parts.map((p) => (
        <section key={p} className="rounded-md bg-card ring-1 ring-foreground/10">
          <header className="border-b border-border px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {t.parts[p as keyof typeof t.parts]}
          </header>
          <ul className="divide-y divide-border">
            {s.blocks
              .filter((b) => b.part === p)
              .map((b) => (
                <li key={b.id} className="flex flex-col gap-2 px-4 py-3">
                  <BlockLine block={b} mode={mode} variant="card" />
                  {blockControls ? (
                    <div className="flex flex-wrap items-center gap-3">{blockControls(b)}</div>
                  ) : null}
                </li>
              ))}
          </ul>
        </section>
      ))}

      {mode === "coach" && s.coachNotes ? (
        <section className="flex flex-col gap-1">
          <Badge variant="outline">{t.coachNotes}</Badge>
          <p className="max-w-prose whitespace-pre-wrap text-sm">{s.coachNotes}</p>
        </section>
      ) : null}

      {notesForm ?? (s.athleteNotes ? (
        <section className="flex flex-col gap-1">
          <h3 className="text-sm font-semibold">{t.athleteNotes}</h3>
          <p className="max-w-prose whitespace-pre-wrap text-sm">{s.athleteNotes}</p>
        </section>
      ) : null)}
    </div>
  );
}
