"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  addCompetitionAthletes,
  createCompetition,
  updateCompetitionEntry,
} from "@/features/competitions/actions";
import {
  COMPETITION_TYPES,
  ENTRY_CONTENT_FIELDS,
  ENTRY_ROUNDS,
} from "@/features/competitions/schema";
import { useMessages } from "@/i18n/client";
import type { AthleteWithRepertoire } from "@/lib/queries/competitions";
import {
  DRAFT_KEY,
  type Draft,
  parseDraft,
  serializeDraft,
  type WizardEntry,
} from "./wizard-draft";

const selectClass =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm shadow-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

function blankDraft(category: string): Draft {
  const d: Draft = { category };
  for (const k of ENTRY_CONTENT_FIELDS) d[k] = "";
  return d;
}

const STEP_KEYS = [
  "competition",
  "athletes",
  "kata",
  "results",
  "feedback",
] as const;

export function CompetitionWizard({
  athletes,
}: {
  athletes: AthleteWithRepertoire[];
}) {
  const nl = useMessages();
  const router = useRouter();
  const c = nl.competition;
  const w = c.wizard;

  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [competitionId, setCompetitionId] = useState<string | null>(null);

  // Step 0 — competition fields.
  const [comp, setComp] = useState({
    name: "",
    date: "",
    competitionType: "" as "" | (typeof COMPETITION_TYPES)[number],
    location: "",
    notes: "",
  });

  // Step 1 — athlete selection.
  const [category, setCategory] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Steps 2–4 — per-entry drafts.
  const [entries, setEntries] = useState<WizardEntry[]>([]);

  // Offline buffering (Ch12): rehydrate any in-progress wizard from localStorage
  // on mount, then mirror state to it on every change — so a reload or network
  // blip never loses entry work. `skipNextSave` avoids clobbering the stored draft
  // with the initial empty state before the restore commit lands.
  const skipNextSave = useRef(true);
  useEffect(() => {
    const draft = parseDraft(
      typeof localStorage === "undefined"
        ? null
        : localStorage.getItem(DRAFT_KEY),
    );
    if (!draft) return;
    // One-time hydration from localStorage — render empty on the server/first
    // paint, then restore on the client (SSR-safe; not a render-loop setState).
    /* eslint-disable react-hooks/set-state-in-effect */
    setStep(draft.step);
    setCompetitionId(draft.competitionId);
    setComp(draft.comp as typeof comp);
    setCategory(draft.category);
    setSelected(new Set(draft.selected));
    setEntries(draft.entries);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }
    try {
      localStorage.setItem(
        DRAFT_KEY,
        serializeDraft({
          step,
          competitionId,
          comp,
          category,
          selected: [...selected],
          entries,
        }),
      );
    } catch {
      // storage unavailable (private mode / quota) — non-fatal.
    }
  }, [step, competitionId, comp, category, selected, entries]);

  function clearDraft() {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      // ignore
    }
  }

  function setDraft(entryId: string, key: string, value: string) {
    setEntries((prev) =>
      prev.map((e) =>
        e.id === entryId ? { ...e, draft: { ...e.draft, [key]: value } } : e,
      ),
    );
  }

  async function persistEntries() {
    for (const e of entries) {
      const fd = new FormData();
      fd.set("id", e.id);
      if (competitionId) fd.set("competitionId", competitionId);
      fd.set("athleteId", e.athleteId);
      fd.set("category", e.draft.category);
      for (const k of ENTRY_CONTENT_FIELDS) fd.set(k, e.draft[k] ?? "");
      await updateCompetitionEntry({ ok: false }, fd);
    }
  }

  async function submitCompetition() {
    setBusy(true);
    setError(null);
    const fd = new FormData();
    fd.set("name", comp.name);
    fd.set("date", comp.date);
    fd.set("competitionType", comp.competitionType);
    fd.set("location", comp.location);
    fd.set("notes", comp.notes);
    try {
      const res = await createCompetition({ ok: false }, fd);
      if (!res.ok || !res.id) {
        setError(
          res.fieldErrors
            ? Object.values(res.fieldErrors)[0]
            : (res.message ?? "Er ging iets mis."),
        );
        return;
      }
      setCompetitionId(res.id);
      setStep(1);
    } catch {
      setError(nl.error.network);
    } finally {
      setBusy(false);
    }
  }

  async function submitAthletes() {
    setBusy(true);
    setError(null);
    const fd = new FormData();
    if (competitionId) fd.set("competitionId", competitionId);
    fd.set("category", category);
    for (const id of selected) fd.append("athleteId", id);
    try {
      const res = await addCompetitionAthletes({ ok: false }, fd);
      if (!res.ok || !res.entries) {
        setError(
          res.fieldErrors
            ? Object.values(res.fieldErrors)[0]
            : (res.message ?? "Er ging iets mis."),
        );
        return;
      }
      const byId = new Map(athletes.map((a) => [a.id, a]));
      setEntries(
        res.entries.map((e) => {
          const a = byId.get(e.athleteId);
          return {
            id: e.id,
            athleteId: e.athleteId,
            athleteName: a ? `${a.firstName} ${a.lastName}` : "",
            repertoire: a?.repertoire ?? [],
            draft: blankDraft(category),
          };
        }),
      );
      setStep(2);
    } catch {
      setError(nl.error.network);
    } finally {
      setBusy(false);
    }
  }

  async function next() {
    // Steps 2–4 persist the current drafts before advancing.
    setBusy(true);
    setError(null);
    try {
      await persistEntries();
      setStep((s) => s + 1);
    } catch {
      setError(nl.error.network); // stay on the step; draft is buffered
    } finally {
      setBusy(false);
    }
  }

  async function finish() {
    setBusy(true);
    setError(null);
    try {
      await persistEntries();
      clearDraft();
      if (competitionId) router.push(`/competitions/${competitionId}`);
    } catch {
      setError(nl.error.network);
      setBusy(false);
    }
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const nextSet = new Set(prev);
      if (nextSet.has(id)) nextSet.delete(id);
      else nextSet.add(id);
      return nextSet;
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <ol className="flex flex-wrap gap-2 text-xs">
        {STEP_KEYS.map((key, i) => (
          <li
            key={key}
            className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 ${
              i === step
                ? "border-foreground font-medium"
                : i < step
                  ? "border-border text-muted-foreground"
                  : "border-border text-muted-foreground/60"
            }`}
          >
            <span aria-hidden>{i < step ? "●" : "○"}</span>
            {w.steps[key]}
          </li>
        ))}
      </ol>

      <p className="text-sm text-muted-foreground">
        {w.step} {step + 1} {w.of} {STEP_KEYS.length} — {w.steps[STEP_KEYS[step]]}
      </p>

      {step === 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <FieldLabel label={c.fields.name}>
            <Input
              value={comp.name}
              onChange={(e) => setComp({ ...comp, name: e.target.value })}
            />
          </FieldLabel>
          <FieldLabel label={c.fields.date}>
            <Input
              type="date"
              value={comp.date}
              onChange={(e) => setComp({ ...comp, date: e.target.value })}
            />
          </FieldLabel>
          <FieldLabel label={c.fields.type}>
            <select
              className={selectClass}
              value={comp.competitionType}
              onChange={(e) =>
                setComp({
                  ...comp,
                  competitionType: e.target
                    .value as (typeof COMPETITION_TYPES)[number],
                })
              }
            >
              <option value="">—</option>
              {COMPETITION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {c.types[t]}
                </option>
              ))}
            </select>
          </FieldLabel>
          <FieldLabel label={c.fields.location}>
            <Input
              value={comp.location}
              onChange={(e) => setComp({ ...comp, location: e.target.value })}
            />
          </FieldLabel>
          <div className="sm:col-span-2">
            <FieldLabel label={c.fields.notes}>
              <Textarea
                rows={2}
                value={comp.notes}
                onChange={(e) => setComp({ ...comp, notes: e.target.value })}
              />
            </FieldLabel>
          </div>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="flex flex-col gap-4">
          <FieldLabel label={c.entry.category}>
            <Input
              value={category}
              placeholder="U14 Kata Individueel"
              onChange={(e) => setCategory(e.target.value)}
            />
          </FieldLabel>
          {athletes.length === 0 ? (
            <p className="text-sm text-muted-foreground">{w.noActiveAthletes}</p>
          ) : (
            <fieldset className="grid gap-1 sm:grid-cols-2">
              <legend className="mb-1 text-sm font-semibold">
                {w.selectAthletes}
              </legend>
              {athletes.map((a) => (
                <label key={a.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selected.has(a.id)}
                    onChange={() => toggle(a.id)}
                  />
                  {a.firstName} {a.lastName}
                </label>
              ))}
            </fieldset>
          )}
        </div>
      ) : null}

      {step === 2 ? (
        <div className="flex flex-col gap-4">
          {entries.map((e) => (
            <EntryCard key={e.id} title={e.athleteName}>
              {e.repertoire.length === 0 ? (
                <p className="text-sm text-muted-foreground">{w.noRepertoire}</p>
              ) : (
                ENTRY_ROUNDS.map((r) => (
                  <div
                    key={r.kata}
                    className="grid gap-2 sm:grid-cols-[7rem_1fr]"
                  >
                    <Label className="self-center">{c.rounds[r.labelKey]}</Label>
                    <select
                      className={selectClass}
                      value={e.draft[r.kata]}
                      onChange={(ev) => setDraft(e.id, r.kata, ev.target.value)}
                    >
                      <option value="">—</option>
                      {e.repertoire.map((k) => (
                        <option key={k.kataId} value={k.kataId}>
                          {k.kataName}
                        </option>
                      ))}
                    </select>
                  </div>
                ))
              )}
            </EntryCard>
          ))}
        </div>
      ) : null}

      {step === 3 ? (
        <div className="flex flex-col gap-4">
          {entries.map((e) => (
            <EntryCard key={e.id} title={e.athleteName}>
              <div className="grid gap-3 sm:grid-cols-2">
                <FieldLabel label={c.entry.placement}>
                  <Input
                    type="number"
                    min={1}
                    value={e.draft.resultPlacement}
                    onChange={(ev) =>
                      setDraft(e.id, "resultPlacement", ev.target.value)
                    }
                  />
                </FieldLabel>
                <FieldLabel label={c.entry.roundReached}>
                  <Input
                    value={e.draft.resultRoundReached}
                    onChange={(ev) =>
                      setDraft(e.id, "resultRoundReached", ev.target.value)
                    }
                  />
                </FieldLabel>
              </div>
              {ENTRY_ROUNDS.filter((r) => e.draft[r.kata]).map((r) => (
                <div key={r.result} className="grid gap-2 sm:grid-cols-[7rem_1fr]">
                  <Label className="self-center">{c.rounds[r.labelKey]}</Label>
                  <select
                    className={selectClass}
                    value={e.draft[r.result]}
                    onChange={(ev) => setDraft(e.id, r.result, ev.target.value)}
                  >
                    <option value="">{c.result.none}</option>
                    <option value="win">{c.result.win}</option>
                    <option value="loss">{c.result.loss}</option>
                  </select>
                </div>
              ))}
            </EntryCard>
          ))}
        </div>
      ) : null}

      {step === 4 ? (
        <div className="flex flex-col gap-4">
          {entries.map((e) => (
            <EntryCard key={e.id} title={e.athleteName}>
              <FieldLabel label={c.entry.feedbackBefore}>
                <Textarea
                  rows={2}
                  value={e.draft.feedbackBefore}
                  onChange={(ev) =>
                    setDraft(e.id, "feedbackBefore", ev.target.value)
                  }
                />
              </FieldLabel>
              <FieldLabel label={c.entry.feedbackPerformance}>
                <Textarea
                  rows={2}
                  value={e.draft.feedbackPerformance}
                  onChange={(ev) =>
                    setDraft(e.id, "feedbackPerformance", ev.target.value)
                  }
                />
              </FieldLabel>
              <FieldLabel label={c.entry.feedbackImprovement}>
                <Textarea
                  rows={2}
                  value={e.draft.feedbackImprovement}
                  onChange={(ev) =>
                    setDraft(e.id, "feedbackImprovement", ev.target.value)
                  }
                />
              </FieldLabel>
              <FieldLabel label={c.entry.feedbackLesson}>
                <Textarea
                  rows={2}
                  value={e.draft.feedbackLesson}
                  onChange={(ev) =>
                    setDraft(e.id, "feedbackLesson", ev.target.value)
                  }
                />
              </FieldLabel>
              <FieldLabel label={c.entry.coachNotes}>
                <Textarea
                  rows={2}
                  value={e.draft.coachNotes}
                  onChange={(ev) =>
                    setDraft(e.id, "coachNotes", ev.target.value)
                  }
                />
              </FieldLabel>
            </EntryCard>
          ))}
        </div>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex gap-2">
        {step > 1 ? (
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => setStep((s) => s - 1)}
          >
            {w.back}
          </Button>
        ) : null}

        {step === 0 ? (
          <Button type="button" disabled={busy} onClick={submitCompetition}>
            {w.next}
          </Button>
        ) : null}
        {step === 1 ? (
          <Button type="button" disabled={busy} onClick={submitAthletes}>
            {w.next}
          </Button>
        ) : null}
        {step === 2 || step === 3 ? (
          <Button type="button" disabled={busy} onClick={next}>
            {w.next}
          </Button>
        ) : null}
        {step === 4 ? (
          <Button type="button" disabled={busy} onClick={finish}>
            {w.finish}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function FieldLabel({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function EntryCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
      <p className="font-medium">{title}</p>
      {children}
    </div>
  );
}
