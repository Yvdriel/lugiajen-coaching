import { z } from "zod";

// Server-authoritative validation (convention 8). Parses raw FormData strings,
// so numbers are coerced and empty optionals normalized to undefined.
const emptyToUndef = (v: unknown) => (v === "" || v == null ? undefined : v);
const optionalInt = z.preprocess(
  emptyToUndef,
  z.coerce.number().int().min(0).max(300).optional(),
);

export const athleteSchema = z.object({
  firstName: z.string().trim().min(1, "Voornaam is verplicht."),
  lastName: z.string().trim().min(1, "Achternaam is verplicht."),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Geboortedatum is verplicht."),
  gender: z.enum(["male", "female"], { message: "Kies een geslacht." }),
  beltRank: z.string().trim().min(1, "Bandgraad is verplicht."),
  yearsTraining: z.preprocess(
    emptyToUndef,
    z.coerce.number().int().min(0).max(99).default(0),
  ),
  yearsCompeting: optionalInt,
  heightCm: optionalInt,
  weightKg: optionalInt,
  notes: z.preprocess(emptyToUndef, z.string().optional()),
  physicalNotes: z.preprocess(emptyToUndef, z.string().optional()),
  // Contact email only. Parental consent is NOT coach-editable — it's collected
  // from the parent via the public consent link (see consent-actions.ts).
  contactEmail: z.preprocess(
    emptyToUndef,
    z.string().email("Ongeldig e-mailadres.").optional(),
  ),
  isActive: z.preprocess(
    (v) => v === "on" || v === true || v === "true",
    z.boolean(),
  ),
});

export type AthleteParsed = z.infer<typeof athleteSchema>;

export const ATHLETE_FIELD_KEYS = [
  "firstName",
  "lastName",
  "dateOfBirth",
  "gender",
  "beltRank",
  "yearsTraining",
  "yearsCompeting",
  "heightCm",
  "weightKg",
  "notes",
  "physicalNotes",
  "isActive",
] as const;

export type AthleteFieldKey = (typeof ATHLETE_FIELD_KEYS)[number];
