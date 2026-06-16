"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { useMessages } from "@/i18n/client";
import type { Category } from "@/lib/categories";

const CATEGORIES: Category[] = [
  "U12",
  "U14",
  "Cadets",
  "Juniors",
  "U21",
  "Senior",
];

const selectClass =
  "h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm shadow-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function AthleteFilters({ belts }: { belts: string[] }) {
  const nl = useMessages();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.replace(`${pathname}?${next.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        className="max-w-xs"
        placeholder={nl.athletes.filters.search}
        defaultValue={params.get("q") ?? ""}
        onChange={(e) => setParam("q", e.target.value)}
      />
      <select
        className={selectClass}
        defaultValue={params.get("category") ?? ""}
        onChange={(e) => setParam("category", e.target.value)}
      >
        <option value="">
          {nl.athletes.filters.category}: {nl.athletes.filters.all}
        </option>
        {CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <select
        className={selectClass}
        defaultValue={params.get("active") ?? ""}
        onChange={(e) => setParam("active", e.target.value)}
      >
        <option value="">
          {nl.athletes.filters.status}: {nl.athletes.filters.all}
        </option>
        <option value="active">{nl.athletes.filters.active}</option>
        <option value="inactive">{nl.athletes.filters.inactive}</option>
      </select>
      <select
        className={selectClass}
        defaultValue={params.get("belt") ?? ""}
        onChange={(e) => setParam("belt", e.target.value)}
      >
        <option value="">
          {nl.athletes.filters.belt}: {nl.athletes.filters.all}
        </option>
        {belts.map((b) => (
          <option key={b} value={b}>
            {b}
          </option>
        ))}
      </select>
      <select
        className={selectClass}
        defaultValue={params.get("sort") ?? "name"}
        onChange={(e) => setParam("sort", e.target.value)}
      >
        <option value="name">{nl.athletes.sort.name}</option>
        <option value="age">{nl.athletes.sort.age}</option>
        <option value="lastFeedback">{nl.athletes.sort.lastFeedback}</option>
        <option value="competitions">{nl.athletes.sort.competitions}</option>
      </select>
    </div>
  );
}
