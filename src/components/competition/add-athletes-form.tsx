"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  addCompetitionAthletes,
  type EntryFormState,
} from "@/features/competitions/actions";
import { useMessages } from "@/i18n/client";
import type { Category } from "@/lib/categories";
import type { AthleteForAdd } from "@/lib/queries/competitions";

/**
 * Detail-page picker to add athletes to a competition. Per athlete, the coach picks
 * one or more age-eligible categories (auto-picked when only one is available);
 * categories already entered for this competition are disabled. Posts repeated
 * `entry` = "<athleteId>:<category>" hidden inputs; the action inserts one row per pair.
 */
export function AddAthletesForm({
  competitionId,
  athletes,
}: {
  competitionId: string;
  athletes: AthleteForAdd[];
}) {
  const nl = useMessages();
  const [state, formAction, pending] = useActionState<EntryFormState, FormData>(
    addCompetitionAthletes,
    { ok: false },
  );
  const formRef = useRef<HTMLFormElement>(null);
  const [picks, setPicks] = useState<Record<string, Category[]>>({});

  useEffect(() => {
    if (!state.ok) return;
    // Clear the picker once the action confirms the insert (synchronizing with the
    // server-action result, not deriving render state).
    formRef.current?.reset();
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    setPicks({});
  }, [state]);

  const c = nl.competition;
  const w = c.wizard;
  if (athletes.length === 0) {
    return <p className="text-sm text-muted-foreground">{c.noAthletesToAdd}</p>;
  }

  function toggleAthlete(a: AthleteForAdd) {
    setPicks((prev) => {
      const next = { ...prev };
      if (Object.hasOwn(next, a.id)) {
        delete next[a.id];
      } else {
        const available = a.categories.filter(
          (cat) => !a.enteredCategories.includes(cat),
        );
        next[a.id] = available.length === 1 ? [available[0]] : [];
      }
      return next;
    });
  }

  function toggleCategory(athleteId: string, cat: Category) {
    setPicks((prev) => {
      const cur = prev[athleteId] ?? [];
      return {
        ...prev,
        [athleteId]: cur.includes(cat)
          ? cur.filter((x) => x !== cat)
          : [...cur, cat],
      };
    });
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="flex flex-col gap-3 rounded-lg border border-border p-4"
    >
      <input type="hidden" name="competitionId" value={competitionId} />
      <p className="text-sm font-semibold">{c.addAthlete}</p>

      {Object.entries(picks).flatMap(([athleteId, cats]) =>
        cats.map((cat) => (
          <input
            key={`${athleteId}:${cat}`}
            type="hidden"
            name="entry"
            value={`${athleteId}:${cat}`}
          />
        )),
      )}

      <div className="flex flex-col gap-2">
        {athletes.map((a) => {
          const available = a.categories.filter(
            (cat) => !a.enteredCategories.includes(cat),
          );
          const exhausted = available.length === 0;
          const checked = Object.hasOwn(picks, a.id);
          const single = available.length === 1;
          return (
            <div
              key={a.id}
              className="flex flex-col gap-1.5 rounded-lg border border-border p-2.5"
            >
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={exhausted}
                  onChange={() => toggleAthlete(a)}
                />
                {a.firstName} {a.lastName}
                {exhausted ? (
                  <span className="text-xs text-muted-foreground">
                    — {w.allCategoriesAdded}
                  </span>
                ) : null}
              </label>
              {checked && !exhausted ? (
                single ? (
                  <span className="ml-6 flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge>{available[0]}</Badge>
                    {w.autoCategory}
                  </span>
                ) : (
                  <div className="ml-6 flex flex-col gap-1">
                    <span className="text-xs text-muted-foreground">
                      {w.selectCategories}
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {a.categories.map((cat) => {
                        const entered = a.enteredCategories.includes(cat);
                        const on = (picks[a.id] ?? []).includes(cat);
                        return (
                          <button
                            key={cat}
                            type="button"
                            aria-pressed={on}
                            disabled={entered}
                            onClick={() => toggleCategory(a.id, cat)}
                            className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                              entered
                                ? "cursor-not-allowed border-border text-muted-foreground/50 line-through"
                                : on
                                  ? "border-foreground bg-foreground text-background"
                                  : "border-border text-muted-foreground hover:border-foreground/40"
                            }`}
                          >
                            {cat}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )
              ) : null}
            </div>
          );
        })}
      </div>

      {state.fieldErrors?.athleteId ? (
        <p className="text-sm text-destructive">{state.fieldErrors.athleteId}</p>
      ) : null}
      {state.message ? (
        <p className="text-sm text-destructive">{state.message}</p>
      ) : null}

      <div>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? nl.common.loading : c.addAthlete}
        </Button>
      </div>
    </form>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-border px-2 py-0.5 text-xs font-medium">
      {children}
    </span>
  );
}
