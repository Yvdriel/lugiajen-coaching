/**
 * A 1-N rating rendered as filled/empty marks — monochrome only (brand rule: no
 * color to carry meaning). Hook-free so it renders on both server and client. Returns
 * null for an unset value.
 */
export function RatingMarks({
  value,
  max = 5,
}: {
  value: number | null | undefined;
  max?: number;
}) {
  if (value == null) return null;
  const filled = Math.max(0, Math.min(max, Math.round(value)));
  return (
    <span
      className="inline-flex items-center gap-0.5 text-sm leading-none"
      aria-label={`${filled}/${max}`}
    >
      {Array.from({ length: max }, (_, i) => (
        <span
          key={i}
          aria-hidden
          className={i < filled ? "text-foreground" : "text-muted-foreground/40"}
        >
          {i < filled ? "●" : "○"}
        </span>
      ))}
    </span>
  );
}
