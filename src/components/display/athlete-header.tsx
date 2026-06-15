import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import type { Category } from "@/lib/categories";

/**
 * Pure presentational athlete header (convention 3): data via props + `mode`.
 * Edit/share affordances are passed in via `actions` by the parent — this
 * component never imports server actions, calls getSession, or renders links.
 */
export type AthleteHeaderProps = {
  firstName: string;
  lastName: string;
  age: number;
  categories: Category[];
  beltRank: string;
  isActive: boolean;
  mode?: "coach" | "public";
  actions?: ReactNode;
};

export function AthleteHeader({
  firstName,
  lastName,
  age,
  categories,
  beltRank,
  isActive,
  mode = "coach",
  actions,
}: AthleteHeaderProps) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6">
      <div className="flex items-center gap-4">
        <div
          className="flex size-16 shrink-0 items-center justify-center rounded-full bg-muted text-lg font-medium text-muted-foreground"
          aria-hidden
        >
          {firstName.charAt(0)}
          {lastName.charAt(0)}
        </div>
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-2xl font-semibold">
            {firstName} {lastName}
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>{age} jaar</span>
            <span aria-hidden>·</span>
            <span>{beltRank}</span>
            {mode === "coach" && !isActive && (
              <Badge variant="outline">Inactief</Badge>
            )}
          </div>
          <div className="mt-1 flex flex-wrap gap-1">
            {categories.map((c) => (
              <Badge key={c} variant="secondary">
                {c}
              </Badge>
            ))}
          </div>
        </div>
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}
