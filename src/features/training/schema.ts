import { z } from "zod";
import type { KataLibraryItem } from "@/lib/queries/kata";
import { SPLIT_SIZE, type Split } from "./vli";

// Training input validation (convention 8). Shared by the MCP tools and any server
// action; the DB never sees an unvalidated block.

export const splitSchema = z.enum(["full", "half", "third", "quarter"]);

export const blockFormatSchema = z.enum([
  "review",
  "technical",
  "quarter_kata",
  "emom",
  "beginning_blast",
  "burpee_endings",
  "leg_day",
  "upper_body",
  "circuit",
  "vest_contrast",
  "other",
]);

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD");

export const blockInputSchema = z
  .object({
    part: z.number().int().min(1).max(6),
    kataId: z.uuid().nullable().optional(),
    label: z.string().min(1).max(120).optional(),
    split: splitSchema.optional(),
    sections: z.array(z.number().int().min(1).max(4)).min(1).optional(),
    reps: z.number().int().min(1).max(50).optional(),
    restRepSec: z.number().int().min(0).max(600).optional(),
    restSectionSec: z.number().int().min(0).max(1200).optional(),
    rounds: z.number().int().min(1).max(20).default(1),
    format: blockFormatSchema.default("technical"),
    vest: z.boolean().default(false),
    minutes: z.number().int().min(1).max(180).optional(),
    notes: z.string().max(2000).optional(),
    coachNotes: z.string().max(2000).optional(),
  })
  .superRefine((b, ctx) => {
    if (b.kataId) {
      if (!b.split || !b.sections || !b.reps) {
        ctx.addIssue({
          code: "custom",
          message: "Kata block needs split, sections and reps.",
        });
      } else if (b.sections.some((i) => i > SPLIT_SIZE[b.split as Split])) {
        ctx.addIssue({
          code: "custom",
          message: `Section index exceeds ${b.split} size (${SPLIT_SIZE[b.split as Split]}).`,
        });
      }
    } else if (!b.label) {
      ctx.addIssue({
        code: "custom",
        message: "Non-kata block needs a label.",
      });
    }
  });
export type BlockInput = z.infer<typeof blockInputSchema>;

export const sessionInputSchema = z.object({
  date: isoDate,
  planId: z.uuid().optional(),
  title: z.string().max(120).optional(),
  notes: z.string().max(4000).optional(),
  coachNotes: z.string().max(4000).optional(),
  blocks: z.array(blockInputSchema).max(40),
});
export type SessionInput = z.infer<typeof sessionInputSchema>;

export const planWeekInputSchema = z.object({
  weekStart: isoDate,
  targetLoad: z.number().int().min(0).max(20),
  targetIntensity: z.number().min(1).max(5).multipleOf(0.5),
  character: z.string().min(1).max(80),
});
export type PlanWeekInput = z.infer<typeof planWeekInputSchema>;

export const planInputSchema = z
  .object({
    athleteId: z.uuid(),
    name: z.string().min(1).max(120),
    startDate: isoDate,
    endDate: isoDate,
    targetCompetitionId: z.uuid().nullable().optional(),
    notes: z.string().max(4000).optional(),
    weeks: z.array(planWeekInputSchema).max(30).default([]),
  })
  .refine((p) => p.startDate <= p.endDate, {
    message: "endDate is before startDate.",
  });
export type PlanInput = z.infer<typeof planInputSchema>;

export const learningSourceSchema = z.enum([
  "session",
  "competition",
  "scoring_card",
  "feedback",
  "manual",
]);

export const learningInputSchema = z.object({
  athleteId: z.uuid().nullable().optional(),
  body: z.string().min(1).max(4000),
  tags: z.array(z.string().min(1).max(40)).max(10).default([]),
  source: learningSourceSchema.default("manual"),
  sourceId: z.uuid().optional(),
});
export type LearningInput = z.infer<typeof learningInputSchema>;

export const timingInputSchema = z.object({
  athleteId: z.uuid().nullable().optional(),
  kataId: z.uuid(),
  timings: z
    .array(
      z.object({
        split: splitSchema,
        sectionIndex: z.number().int().min(1).max(4),
        seconds: z.number().int().min(1).max(600),
      }),
    )
    .min(1)
    .max(10),
});
export type TimingInput = z.infer<typeof timingInputSchema>;

export const availabilitySlotSchema = z.object({
  weekday: z.number().int().min(1).max(7),
  minutes: z.number().int().min(15).max(480),
  label: z.string().min(1).max(120),
  coachLed: z.boolean().default(false),
});
export const availabilityInputSchema = z.object({
  athleteId: z.uuid(),
  slots: z.array(availabilitySlotSchema).max(14),
});
export type AvailabilityInput = z.infer<typeof availabilityInputSchema>;

/** Splits a kata allows, from its seed flags. Full is always allowed. */
export function allowedSplits(
  k: Pick<KataLibraryItem, "splitQuarter" | "splitThird" | "splitHalf">,
): Split[] {
  const out: Split[] = ["full"];
  if (k.splitHalf) out.push("half");
  if (k.splitThird) out.push("third");
  if (k.splitQuarter) out.push("quarter");
  return out;
}

/** Null when the block's split is allowed for the kata, else a message naming it. */
export function validateBlockSplit(
  b: { split?: Split | null },
  k: Pick<
    KataLibraryItem,
    "name" | "splitQuarter" | "splitThird" | "splitHalf"
  >,
): string | null {
  if (b.split == null || allowedSplits(k).includes(b.split)) return null;
  return `${k.name} cannot be split into ${b.split} (allowed: ${allowedSplits(k).join(", ")}).`;
}
