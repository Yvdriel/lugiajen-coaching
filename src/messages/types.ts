import type { nl } from "./nl";

// Widen the `as const` literal types of the Dutch source to plain string/number,
// so every other locale catalog is checked for *completeness* (same keys) without
// being forced to repeat the Dutch literal values.
type Widen<T> = T extends string
  ? string
  : T extends number
    ? number
    : { [K in keyof T]: Widen<T[K]> };

export type Messages = Widen<typeof nl>;
