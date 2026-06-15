import { z } from "zod";

// Server-authoritative validation for athlete_kata (repertoire) writes (convention 8).
const emptyToUndef = (v: unknown) => (v === "" || v == null ? undefined : v);

export const athleteKataSchema = z.object({
  roundOrder: z.preprocess(
    emptyToUndef,
    z.coerce.number().int().min(1, "Minimaal 1.").max(20, "Maximaal 20.").optional(),
  ),
  isCompetitionKata: z.preprocess(
    (v) => v === "on" || v === true || v === "true",
    z.boolean(),
  ),
  proficiency: z.preprocess(
    emptyToUndef,
    z.coerce.number().int().min(1, "Minimaal 1.").max(10, "Maximaal 10.").default(1),
  ),
  notes: z.preprocess(emptyToUndef, z.string().optional()),
});

export type AthleteKataParsed = z.infer<typeof athleteKataSchema>;
