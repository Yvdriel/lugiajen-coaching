import { relations } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// Better Auth tables (user/session/account/verification) — owned by drizzle-kit,
// regenerated via `pnpm exec better-auth generate`. Re-exported so the single
// drizzle.config schema path covers them in one migration. App uuid tables never
// FK to user.id (BA PKs are text; convention 7).
export * from "./auth-schema";

// ── Enums ───────────────────────────────────────────────────────────────────
export const genderEnum = pgEnum("gender", ["male", "female"]);
export const kataCategoryEnum = pgEnum("kata_category", [
  "competition",
  "development",
]);
export const flexCategoryEnum = pgEnum("flex_category", ["A", "B", "C"]);
export const formTypeEnum = pgEnum("form_type", [
  "U12",
  "CADET",
  "JUNIOR",
  "SENIOR",
]);
// Feedback gesprek lifecycle. `completed` is the default so existing rows and the
// fill-in-person path keep counting as finished meetings; the prepared-flow drafts
// move awaiting_athlete → athlete_submitted → completed.
export const feedbackStatusEnum = pgEnum("feedback_status", [
  "awaiting_athlete",
  "athlete_submitted",
  "completed",
]);
// Athlete's own claim on a prior goal/action ("did you do it?"), set in the
// prepare flow. The coach's authoritative action verdict reuses these three plus
// a `pending` sentinel (not-yet-reviewed) via actionCoachDispositionEnum.
export const dispositionEnum = pgEnum("disposition", [
  "done",
  "partly",
  "not_done",
]);
export const actionCoachDispositionEnum = pgEnum("action_coach_disposition", [
  "pending",
  "done",
  "partly",
  "not_done",
]);
// Goal lifecycle across the review loop. `active` = open; the rest are terminal
// dispositions set when a later meeting reviews the goal.
export const goalStatusEnum = pgEnum("goal_status", [
  "active",
  "achieved",
  "carried",
  "dropped",
]);
// Only set when a goal is carried — is it moving or stuck? `stalled` forces a reason.
export const goalMomentumEnum = pgEnum("goal_momentum", [
  "progressing",
  "stalled",
]);
// Which of the template's goal slots a goal row came from.
export const goalCategoryEnum = pgEnum("goal_category", [
  "main",
  "performance",
  "outcome",
  "kata_focus",
]);
export const competitionTypeEnum = pgEnum("competition_type", [
  "club",
  "regional",
  "national",
  "international",
]);
export const roundResultEnum = pgEnum("round_result", ["win", "loss"]);

// ── Video clip enums ──────────────────────────────────────────────────────────
// kind: raw = original recording; analysis/comparison = Kinovea re-uploads pointing
// back at their source via derivedFromClipId; still = single annotated frame.
export const clipKindEnum = pgEnum("clip_kind", [
  "raw",
  "analysis",
  "comparison",
  "still",
]);
// Only Cloudflare Stream today; enum leaves room for future providers.
export const clipProviderEnum = pgEnum("clip_provider", ["cloudflare_stream"]);
// uploading -> processing -> ready, with error as the terminal failure state.
export const clipStatusEnum = pgEnum("clip_status", [
  "uploading",
  "processing",
  "ready",
  "error",
]);
// coach_only by default; promotion to portal is always explicit, never on upload.
export const clipVisibilityEnum = pgEnum("clip_visibility", [
  "coach_only",
  "portal",
]);
// Polymorphic attachment target. contextId is intentionally not a FK.
export const clipContextTypeEnum = pgEnum("clip_context_type", [
  "score_card",
  "competition_entry",
  "athlete_kata",
]);
export const clipAddedByEnum = pgEnum("clip_added_by", ["coach", "athlete"]);

// ── athletes ──────────────────────────────────────────────────────────────────
export const athletes = pgTable("athletes", {
  id: uuid("id").primaryKey().defaultRandom(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  dateOfBirth: date("date_of_birth").notNull(),
  gender: genderEnum("gender").notNull(),
  beltRank: text("belt_rank").notNull(),
  yearsTraining: integer("years_training").notNull().default(0),
  yearsCompeting: integer("years_competing"),
  heightCm: integer("height_cm"),
  weightKg: integer("weight_kg"),
  notes: text("notes"),
  physicalNotes: text("physical_notes"),
  // Contact + parental consent (AVG/GDPR). `contactEmail` is where prepare/portal
  // links are sent — usually a parent for minors. Athletes under 16 are gated: no
  // portal, no email until `parentalConsentAt` is recorded (consent given by the
  // named parent). See features/athletes/consent.ts.
  contactEmail: text("contact_email"),
  // Parental consent is written ONLY by the public consent submit (consent-actions.ts),
  // never by the coach. `consentToken` is a 7-day public link the parent uses to
  // self-certify; it's kept after submit (so the page can show the thank-you) and
  // regenerated when the coach re-sends. One-shot is enforced by the parental_consent_at
  // guard, not by clearing the token.
  parentalConsentAt: timestamp("parental_consent_at"),
  parentalConsentName: text("parental_consent_name"),
  consentToken: text("consent_token").unique(),
  consentTokenExpiresAt: timestamp("consent_token_expires_at"),
  viewToken: text("view_token")
    .notNull()
    .unique()
    .$defaultFn(() => crypto.randomUUID()),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// ── kata (pre-seeded library) ────────────────────────────────────────────────
export const kata = pgTable("kata", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  category: kataCategoryEnum("category").notNull(),
  splitQuarter: boolean("split_quarter").notNull().default(false),
  splitThird: boolean("split_third").notNull().default(false),
  splitHalf: boolean("split_half").notNull().default(false),
  flexibilityCategory: flexCategoryEnum("flexibility_category").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

// ── athlete_kata (per-athlete repertoire) ─────────────────────────────────────
export const athleteKata = pgTable("athlete_kata", {
  id: uuid("id").primaryKey().defaultRandom(),
  athleteId: uuid("athlete_id")
    .notNull()
    .references(() => athletes.id, { onDelete: "cascade" }),
  kataId: uuid("kata_id")
    .notNull()
    .references(() => kata.id, { onDelete: "cascade" }),
  roundOrder: integer("round_order"),
  isCompetitionKata: boolean("is_competition_kata").notNull().default(false),
  // kata level (proficiency) is derived from the latest scoring card — not stored.
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// ── kata_scoring_cards (append-only history; convention 5) ─────────────────────
export const kataScoringCards = pgTable(
  "kata_scoring_cards",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    athleteId: uuid("athlete_id")
      .notNull()
      .references(() => athletes.id, { onDelete: "cascade" }),
    kataId: uuid("kata_id")
      .notNull()
      .references(() => kata.id, { onDelete: "cascade" }),
    assessmentDate: date("assessment_date").notNull(),
    // WKF technical performance (0-100)
    stances: integer("stances").notNull(),
    techniques: integer("techniques").notNull(),
    transitions: integer("transitions").notNull(),
    timing: integer("timing").notNull(),
    breathing: integer("breathing").notNull(),
    kiai: integer("kiai").notNull(),
    kime: integer("kime").notNull(),
    conformance: integer("conformance").notNull(),
    // WKF athletic performance (0-100)
    strength: integer("strength").notNull(),
    speed: integer("speed").notNull(),
    balance: integer("balance").notNull(),
    rhythm: integer("rhythm").notNull(),
    // overall impression is derived (mean of the 12 criteria), not stored — see criteria.ts
    kataSpecificNotes: text("kata_specific_notes"),
    priorityImprovements: text("priority_improvements"),
    strengths: text("strengths"),
    coachNotes: text("coach_notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("scoring_athlete_kata_date_idx").on(
      t.athleteId,
      t.kataId,
      t.assessmentDate,
    ),
  ],
);

// ── feedback_forms (parent-meeting forms; U12 / CADET / JUNIOR / SENIOR) ───────
export const feedbackForms = pgTable("feedback_forms", {
  id: uuid("id").primaryKey().defaultRandom(),
  athleteId: uuid("athlete_id")
    .notNull()
    .references(() => athletes.id, { onDelete: "cascade" }),
  formType: formTypeEnum("form_type").notNull(),
  meetingNumber: integer("meeting_number").notNull(),
  meetingDate: date("meeting_date").notNull(),
  season: text("season").notNull(),
  // Lifecycle — `completed` by default (fill-in-person path); prepared-flow drafts
  // start `awaiting_athlete`. prepareToken is the per-form public hash link (null
  // unless prepared); the three timestamps audit opened/submitted/completed.
  status: feedbackStatusEnum("status").notNull().default("completed"),
  prepareToken: text("prepare_token").unique(),
  athleteOpenedAt: timestamp("athlete_opened_at"),
  athleteSubmittedAt: timestamp("athlete_submitted_at"),
  completedAt: timestamp("completed_at"),
  // Last time a prepare-link invite/reminder was emailed — throttles the cron
  // (one nudge per interval) and records manual sends. Null until first send.
  lastReminderAt: timestamp("last_reminder_at"),
  // Side A — athlete self-assessment
  athleteProudOf: text("athlete_proud_of"),
  athleteHardestThing: text("athlete_hardest_thing"),
  athleteShowParents: text("athlete_show_parents"), // U12
  athleteFunScore: integer("athlete_fun_score"), // U12 (1-5)
  athleteMakeMoreFun: text("athlete_make_more_fun"), // U12
  athleteQuestion: text("athlete_question"),
  // CADET+ self-ratings (1-5)
  selfRatingTraining: integer("self_rating_training"),
  selfRatingMotivation: integer("self_rating_motivation"),
  selfRatingBody: integer("self_rating_body"),
  selfRatingCompetition: integer("self_rating_competition"),
  athleteNeedsWork: text("athlete_needs_work"), // CADET
  // SENIOR-only extra self-ratings (1-5)
  selfRatingTrainingQuality: integer("self_rating_training_quality"), // SENIOR
  selfRatingRecovery: integer("self_rating_recovery"), // SENIOR
  selfRatingMental: integer("self_rating_mental"), // SENIOR
  // JUNIOR + SENIOR reflections
  trainingQualityReflection: text("training_quality_reflection"), // JUNIOR+SENIOR
  competitionReflection: text("competition_reflection"), // JUNIOR+SENIOR
  mentalPreparation: text("mental_preparation"), // JUNIOR
  // SENIOR-only reflections
  mentalPreparationReview: text("mental_preparation_review"), // SENIOR
  trainingPeriodReflection: text("training_period_reflection"), // SENIOR
  physicalStateNotes: text("physical_state_notes"), // SENIOR
  athleteDiscussionPoints: text("athlete_discussion_points"), // SENIOR
  // Side B — coach
  coachStrength: text("coach_strength"),
  coachDevelopmentArea: text("coach_development_area"),
  trainingStructureFeedback: text("training_structure_feedback"), // JUNIOR+SENIOR
  previousGoalsReview: text("previous_goals_review"), // SENIOR
  // Goals
  goalMain: text("goal_main"),
  goalPerformance: text("goal_performance"), // CADET+
  goalOutcome: text("goal_outcome"), // CADET+
  kataFocus: text("kata_focus"), // CADET+
  periodizationNotes: text("periodization_notes"), // JUNIOR+SENIOR
  physicalPlan: text("physical_plan"), // SENIOR
  // Action items (up to 3, SENIOR adds a 4th)
  action1: text("action_1"),
  action2: text("action_2"),
  action3: text("action_3"),
  action4: text("action_4"), // SENIOR
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
}, (t) => [
  // Hot path: per-athlete lists filtered to completed gesprekken (stats, portal,
  // dashboard "days since last feedback").
  index("feedback_athlete_status_idx").on(t.athleteId, t.status),
]);

// ── feedback_kata_ratings (athlete kata self-score per feedback gesprek) ───────
// One row per rated kata. Set is replaced on edit (delete + reinsert).
export const feedbackKataRatings = pgTable("feedback_kata_ratings", {
  id: uuid("id").primaryKey().defaultRandom(),
  feedbackId: uuid("feedback_id")
    .notNull()
    .references(() => feedbackForms.id, { onDelete: "cascade" }),
  kataId: uuid("kata_id")
    .notNull()
    .references(() => kata.id, { onDelete: "cascade" }),
  score: integer("score"), // self-score 1-10
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── feedback_goals (one row per goal; promoted from the old goal_* columns) ─────
// The review loop needs per-goal status + lineage, which columns can't carry. The
// non-carried set (carriedFromGoalId IS NULL) is replaced on save like kata ratings;
// carried rows are spawned by the review write and survive a re-save.
export const feedbackGoals = pgTable(
  "feedback_goals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    feedbackId: uuid("feedback_id")
      .notNull()
      .references(() => feedbackForms.id, { onDelete: "cascade" }),
    category: goalCategoryEnum("category").notNull(),
    text: text("text").notNull(),
    status: goalStatusEnum("status").notNull().default("active"),
    momentum: goalMomentumEnum("momentum"),
    coachReason: text("coach_reason"),
    // Athlete self-claim from the prepare flow (Side A); never coach-authoritative.
    athleteDisposition: dispositionEnum("athlete_disposition"),
    athleteReason: text("athlete_reason"),
    // Lineage: a carried goal points back at the prior meeting's goal it continues.
    carriedFromGoalId: uuid("carried_from_goal_id").references(
      (): AnyPgColumn => feedbackGoals.id,
      { onDelete: "set null" },
    ),
    // On the PRIOR row: which meeting reviewed/dispositioned it.
    reviewedAtMeetingId: uuid("reviewed_at_meeting_id").references(
      () => feedbackForms.id,
      { onDelete: "set null" },
    ),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("feedback_goals_feedback_idx").on(t.feedbackId, t.sortOrder),
    index("feedback_goals_carried_idx").on(t.carriedFromGoalId),
    // One carried goal per (meeting, source) so a re-save can't double-spawn.
    uniqueIndex("feedback_goals_carry_uq").on(t.feedbackId, t.carriedFromGoalId),
  ],
);

// ── feedback_action_items (uncapped, kata-taggable; promoted from action_1..4) ──
export const feedbackActionItems = pgTable(
  "feedback_action_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    feedbackId: uuid("feedback_id")
      .notNull()
      .references(() => feedbackForms.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
    // null = "general" (not tied to a repertoire kata).
    kataId: uuid("kata_id").references(() => kata.id, { onDelete: "set null" }),
    sortOrder: integer("sort_order").notNull().default(0),
    coachDisposition: actionCoachDispositionEnum("coach_disposition")
      .notNull()
      .default("pending"),
    coachNote: text("coach_note"),
    athleteDisposition: dispositionEnum("athlete_disposition"),
    athleteReason: text("athlete_reason"),
    carriedFromActionId: uuid("carried_from_action_id").references(
      (): AnyPgColumn => feedbackActionItems.id,
      { onDelete: "set null" },
    ),
    reviewedAtMeetingId: uuid("reviewed_at_meeting_id").references(
      () => feedbackForms.id,
      { onDelete: "set null" },
    ),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("feedback_action_items_feedback_idx").on(t.feedbackId, t.sortOrder),
    index("feedback_action_items_carried_idx").on(t.carriedFromActionId),
    uniqueIndex("feedback_action_items_carry_uq").on(
      t.feedbackId,
      t.carriedFromActionId,
    ),
  ],
);

// ── competitions ──────────────────────────────────────────────────────────────
export const competitions = pgTable("competitions", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  date: date("date").notNull(),
  location: text("location"),
  competitionType: competitionTypeEnum("competition_type").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── competition_entries ───────────────────────────────────────────────────────
// One row per (competition, athlete, category): an athlete can compete in two
// categories at once (e.g. U21 + Senior), each with its own kata-per-round +
// results + feedback. The unique index enforces that triple.
export const competitionEntries = pgTable(
  "competition_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    competitionId: uuid("competition_id")
      .notNull()
      .references(() => competitions.id, { onDelete: "cascade" }),
    athleteId: uuid("athlete_id")
      .notNull()
      .references(() => athletes.id, { onDelete: "cascade" }),
    category: text("category").notNull(),
    resultPlacement: integer("result_placement"),
    resultRoundReached: text("result_round_reached"),
    // kata performed per round (from the athlete's repertoire) + per-round result
    kataRound1: uuid("kata_round_1").references(() => kata.id),
    kataRound1Result: roundResultEnum("kata_round_1_result"),
    kataRound2: uuid("kata_round_2").references(() => kata.id),
    kataRound2Result: roundResultEnum("kata_round_2_result"),
    kataRound3: uuid("kata_round_3").references(() => kata.id),
    kataRound3Result: roundResultEnum("kata_round_3_result"),
    kataRound4: uuid("kata_round_4").references(() => kata.id),
    kataRound4Result: roundResultEnum("kata_round_4_result"),
    kataFinal: uuid("kata_final").references(() => kata.id),
    kataFinalResult: roundResultEnum("kata_final_result"),
    // entry feedback
    feedbackBefore: text("feedback_before"),
    feedbackPerformance: text("feedback_performance"),
    feedbackImprovement: text("feedback_improvement"),
    feedbackLesson: text("feedback_lesson"),
    coachNotes: text("coach_notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("competition_entries_comp_athlete_category_idx").on(
      t.competitionId,
      t.athleteId,
      t.category,
    ),
  ],
);

// ── competition_athlete_reflection ────────────────────────────────────────────
// One athlete reflection per (competition, athlete) — the athlete's own read on a
// competition, filled during a meeting's prep (blind to the coach's per-entry
// feedback). The four structured fields intentionally mirror the coach's entry
// feedback so the meeting can lay them side by side. `reflectedAtMeetingId` is the
// meeting whose prep captured it (set null if that meeting is later deleted); the
// window resolver uses it to keep a reflected competition from reappearing next time.
export const competitionAthleteReflection = pgTable(
  "competition_athlete_reflection",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    competitionId: uuid("competition_id")
      .notNull()
      .references(() => competitions.id, { onDelete: "cascade" }),
    athleteId: uuid("athlete_id")
      .notNull()
      .references(() => athletes.id, { onDelete: "cascade" }),
    reflectedAtMeetingId: uuid("reflected_at_meeting_id").references(
      () => feedbackForms.id,
      { onDelete: "set null" },
    ),
    overallRating: smallint("overall_rating"), // 1-5 gut read; validated in app
    reflectionBefore: text("reflection_before"),
    reflectionPerformance: text("reflection_performance"),
    reflectionImprovement: text("reflection_improvement"),
    reflectionLesson: text("reflection_lesson"),
    reflectionNotes: text("reflection_notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("competition_athlete_reflection_comp_athlete_idx").on(
      t.competitionId,
      t.athleteId,
    ),
  ],
);

// ── athlete_notes (append-only timestamped coach log; Notities tab) ────────────
export const athleteNotes = pgTable("athlete_notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  athleteId: uuid("athlete_id")
    .notNull()
    .references(() => athletes.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── clips (video assets; Cloudflare Stream) ───────────────────────────────────
// Every asset is created requireSignedURLs=true; bytes never pass through the
// server. This row holds only metadata + the Stream uid (assetId).
export const clips = pgTable(
  "clips",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    athleteId: uuid("athlete_id")
      .notNull()
      .references(() => athletes.id, { onDelete: "cascade" }),
    kataId: uuid("kata_id").references(() => kata.id),
    kind: clipKindEnum("kind").notNull().default("raw"),
    // Self-reference: analysis/comparison clips point at their source raw clip.
    // Deleting the source keeps the derived clip but drops the link (set null).
    derivedFromClipId: uuid("derived_from_clip_id").references(
      (): AnyPgColumn => clips.id,
      { onDelete: "set null" },
    ),
    provider: clipProviderEnum("provider")
      .notNull()
      .default("cloudflare_stream"),
    assetId: text("asset_id").notNull(),
    status: clipStatusEnum("status").notNull().default("uploading"),
    durationMs: integer("duration_ms"),
    thumbnailUrl: text("thumbnail_url"),
    visibility: clipVisibilityEnum("visibility").notNull().default("coach_only"),
    // When the kata was performed, distinct from createdAt (upload time).
    recordedAt: timestamp("recorded_at"),
    label: text("label"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("clips_athlete_kind_idx").on(t.athleteId, t.kind),
    index("clips_derived_from_idx").on(t.derivedFromClipId),
  ],
);

// ── clip_attachments (polymorphic link from a clip to an existing context) ─────
// contextId references a row in kata_scoring_cards / competition_entries /
// athlete_kata (all uuid PKs). No FK because the target table is polymorphic.
export const clipAttachments = pgTable(
  "clip_attachments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clipId: uuid("clip_id")
      .notNull()
      .references(() => clips.id, { onDelete: "cascade" }),
    contextType: clipContextTypeEnum("context_type").notNull(),
    contextId: uuid("context_id").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("clip_attachments_clip_context_idx").on(
      t.clipId,
      t.contextType,
      t.contextId,
    ),
    index("clip_attachments_context_idx").on(t.contextType, t.contextId),
  ],
);

// ── feedback_clips (the parent-meeting clip reel) ──────────────────────────────
// Ordered set of clips curated onto a feedback gesprek; played in the meeting and
// (once the form is completed + consent holds) exposed on the portal.
export const feedbackClips = pgTable(
  "feedback_clips",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    feedbackId: uuid("feedback_id")
      .notNull()
      .references(() => feedbackForms.id, { onDelete: "cascade" }),
    clipId: uuid("clip_id")
      .notNull()
      .references(() => clips.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull(),
    caption: text("caption"),
    addedBy: clipAddedByEnum("added_by").notNull().default("coach"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("feedback_clips_feedback_clip_idx").on(t.feedbackId, t.clipId),
    index("feedback_clips_feedback_order_idx").on(t.feedbackId, t.sortOrder),
  ],
);

// ── Relations ─────────────────────────────────────────────────────────────────
export const athletesRelations = relations(athletes, ({ many }) => ({
  athleteKata: many(athleteKata),
  scoringCards: many(kataScoringCards),
  feedbackForms: many(feedbackForms),
  competitionEntries: many(competitionEntries),
  notes: many(athleteNotes),
  clips: many(clips),
}));

export const athleteNotesRelations = relations(athleteNotes, ({ one }) => ({
  athlete: one(athletes, {
    fields: [athleteNotes.athleteId],
    references: [athletes.id],
  }),
}));

export const kataRelations = relations(kata, ({ many }) => ({
  athleteKata: many(athleteKata),
  scoringCards: many(kataScoringCards),
  feedbackKataRatings: many(feedbackKataRatings),
  clips: many(clips),
}));

export const athleteKataRelations = relations(athleteKata, ({ one }) => ({
  athlete: one(athletes, {
    fields: [athleteKata.athleteId],
    references: [athletes.id],
  }),
  kata: one(kata, { fields: [athleteKata.kataId], references: [kata.id] }),
}));

export const kataScoringCardsRelations = relations(
  kataScoringCards,
  ({ one }) => ({
    athlete: one(athletes, {
      fields: [kataScoringCards.athleteId],
      references: [athletes.id],
    }),
    kata: one(kata, {
      fields: [kataScoringCards.kataId],
      references: [kata.id],
    }),
  }),
);

export const feedbackFormsRelations = relations(
  feedbackForms,
  ({ one, many }) => ({
    athlete: one(athletes, {
      fields: [feedbackForms.athleteId],
      references: [athletes.id],
    }),
    kataRatings: many(feedbackKataRatings),
    feedbackClips: many(feedbackClips),
    goals: many(feedbackGoals),
    actionItems: many(feedbackActionItems),
  }),
);

export const feedbackKataRatingsRelations = relations(
  feedbackKataRatings,
  ({ one }) => ({
    feedback: one(feedbackForms, {
      fields: [feedbackKataRatings.feedbackId],
      references: [feedbackForms.id],
    }),
    kata: one(kata, {
      fields: [feedbackKataRatings.kataId],
      references: [kata.id],
    }),
  }),
);

export const feedbackGoalsRelations = relations(feedbackGoals, ({ one }) => ({
  feedback: one(feedbackForms, {
    fields: [feedbackGoals.feedbackId],
    references: [feedbackForms.id],
  }),
}));

export const feedbackActionItemsRelations = relations(
  feedbackActionItems,
  ({ one }) => ({
    feedback: one(feedbackForms, {
      fields: [feedbackActionItems.feedbackId],
      references: [feedbackForms.id],
    }),
    kata: one(kata, {
      fields: [feedbackActionItems.kataId],
      references: [kata.id],
    }),
  }),
);

export const competitionsRelations = relations(competitions, ({ many }) => ({
  entries: many(competitionEntries),
}));

export const competitionEntriesRelations = relations(
  competitionEntries,
  ({ one }) => ({
    competition: one(competitions, {
      fields: [competitionEntries.competitionId],
      references: [competitions.id],
    }),
    athlete: one(athletes, {
      fields: [competitionEntries.athleteId],
      references: [athletes.id],
    }),
  }),
);

export const competitionAthleteReflectionRelations = relations(
  competitionAthleteReflection,
  ({ one }) => ({
    competition: one(competitions, {
      fields: [competitionAthleteReflection.competitionId],
      references: [competitions.id],
    }),
    athlete: one(athletes, {
      fields: [competitionAthleteReflection.athleteId],
      references: [athletes.id],
    }),
    reflectedAtMeeting: one(feedbackForms, {
      fields: [competitionAthleteReflection.reflectedAtMeetingId],
      references: [feedbackForms.id],
    }),
  }),
);

export const clipsRelations = relations(clips, ({ one, many }) => ({
  athlete: one(athletes, {
    fields: [clips.athleteId],
    references: [athletes.id],
  }),
  kata: one(kata, { fields: [clips.kataId], references: [kata.id] }),
  derivedFrom: one(clips, {
    fields: [clips.derivedFromClipId],
    references: [clips.id],
    relationName: "clipDerivation",
  }),
  derivedClips: many(clips, { relationName: "clipDerivation" }),
  attachments: many(clipAttachments),
  feedbackClips: many(feedbackClips),
}));

export const clipAttachmentsRelations = relations(
  clipAttachments,
  ({ one }) => ({
    clip: one(clips, {
      fields: [clipAttachments.clipId],
      references: [clips.id],
    }),
  }),
);

export const feedbackClipsRelations = relations(feedbackClips, ({ one }) => ({
  feedback: one(feedbackForms, {
    fields: [feedbackClips.feedbackId],
    references: [feedbackForms.id],
  }),
  clip: one(clips, { fields: [feedbackClips.clipId], references: [clips.id] }),
}));
