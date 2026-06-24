import { z } from "zod";

// Server-authoritative validation for the clip-upload metadata (the video bytes
// go straight to Cloudflare; only this metadata reaches the action).
const emptyToUndef = (v: unknown) => (v === "" || v == null ? undefined : v);
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const clipUploadSchema = z
  .object({
    athleteId: z.string().regex(UUID_RE, "Onbekende atleet."),
    kataId: z.preprocess(
      emptyToUndef,
      z.string().regex(UUID_RE, "Ongeldige kata.").optional(),
    ),
    recordedAt: z.preprocess(
      emptyToUndef,
      z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Ongeldige datum.")
        .optional(),
    ),
    label: z.preprocess(emptyToUndef, z.string().trim().max(200).optional()),
    // A new upload is `raw`; the Kinovea round-trip re-uploads an export as an
    // `analysis`/`comparison` clip linked back to its source via derivedFromClipId.
    kind: z.preprocess(
      emptyToUndef,
      z.enum(["raw", "analysis", "comparison"]).optional(),
    ),
    derivedFromClipId: z.preprocess(
      emptyToUndef,
      z.string().regex(UUID_RE, "Ongeldige bronvideo.").optional(),
    ),
  })
  // A derived clip and its source travel together: one without the other is invalid.
  .refine(
    (d) => {
      const derived = d.kind === "analysis" || d.kind === "comparison";
      return derived === Boolean(d.derivedFromClipId);
    },
    {
      message: "Een afgeleide video vereist een type én een bronvideo.",
      path: ["derivedFromClipId"],
    },
  );

export type ClipUploadInput = z.infer<typeof clipUploadSchema>;
