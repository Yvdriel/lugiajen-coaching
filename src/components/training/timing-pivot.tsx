"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { saveTimings, type TrainingFormState } from "@/features/training/actions";
import { SPLIT_SIZE, type Split } from "@/features/training/vli";
import { useMessages } from "@/i18n/client";
import type { TimingRow } from "@/lib/queries/training";
import { cn } from "@/lib/utils";

type Kata = { kataId: string; kataName: string; splits: Split[] };

function KataTable({
  athleteId,
  kata,
  timings,
  mode,
}: {
  athleteId: string;
  kata: Kata;
  timings: TimingRow[];
  mode: "coach" | "public";
}) {
  const t = useMessages().athlete.training;
  const [state, formAction, pending] = useActionState<TrainingFormState, FormData>(saveTimings, { ok: false });
  const rows = timings.filter((r) => r.kataId === kata.kataId);
  const lookup = (split: Split, i: number) => {
    const own = rows.find((r) => !r.isDefault && r.split === split && r.sectionIndex === i);
    const def = rows.find((r) => r.isDefault && r.split === split && r.sectionIndex === i);
    return own ? { seconds: own.seconds, isDefault: false } : def ? { seconds: def.seconds, isDefault: true } : null;
  };

  const table = (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-24">{kata.kataName}</TableHead>
          {[1, 2, 3, 4].map((i) => (
            <TableHead key={i} className="text-center">
              {t.progress.section} {i}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {kata.splits.map((split) => (
          <TableRow key={split}>
            <TableCell className="text-xs uppercase text-muted-foreground">{split}</TableCell>
            {[1, 2, 3, 4].map((i) => {
              if (i > SPLIT_SIZE[split]) return <TableCell key={i} className="bg-muted/40" />;
              const v = lookup(split, i);
              return (
                <TableCell key={i} className="text-center tabular-nums">
                  {mode === "coach" ? (
                    <input
                      name={`s:${split}:${i}`}
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={600}
                      defaultValue={v && !v.isDefault ? v.seconds : ""}
                      placeholder={v?.isDefault ? String(v.seconds) : "—"}
                      title={v?.isDefault ? t.progress.defaultTiming : undefined}
                      className="h-8 w-16 rounded-md border border-input bg-background text-center text-sm"
                    />
                  ) : (
                    <span className={cn(v?.isDefault && "text-muted-foreground")} title={v?.isDefault ? t.progress.defaultTiming : undefined}>
                      {v ? v.seconds : "—"}
                    </span>
                  )}
                </TableCell>
              );
            })}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  if (mode !== "coach") return table;
  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="athleteId" value={athleteId} />
      <input type="hidden" name="kataId" value={kata.kataId} />
      {table}
      <div className="flex items-center gap-2 self-end">
        {state.ok ? <span className="text-xs text-muted-foreground">{t.saved}</span> : null}
        {state.message ? <span className="text-xs text-destructive">{state.message}</span> : null}
        <Button type="submit" size="sm" variant="outline" disabled={pending}>
          {t.save}
        </Button>
      </div>
    </form>
  );
}

/** Kata × split × section seconds. Coach edits per kata; athlete reads. */
export function TimingPivot({
  athleteId,
  repertoire,
  timings,
  mode,
}: {
  athleteId: string;
  repertoire: Kata[];
  timings: TimingRow[];
  mode: "coach" | "public";
}) {
  const t = useMessages().athlete.training;
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-heading text-base font-semibold">{t.progress.timings}</h2>
      {repertoire.map((k) => (
        <div key={k.kataId} className="overflow-x-auto rounded-md bg-card ring-1 ring-foreground/10">
          <KataTable athleteId={athleteId} kata={k} timings={timings} mode={mode} />
        </div>
      ))}
    </section>
  );
}
