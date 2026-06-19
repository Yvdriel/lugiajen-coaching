import { relations } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
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
export const competitionTypeEnum = pgEnum("competition_type", [
  "club",
  "regional",
  "national",
  "international",
]);
export const roundResultEnum = pgEnum("round_result", ["win", "loss"]);

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
  // never by the coach. `consentToken` is a one-shot 7-day public link the parent uses
  // to self-certify; it's cleared on submit and regenerated when the coach re-sends.
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
  proficiency: integer("proficiency").notNull().default(1), // 0-100
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
    // overall + notes
    overallImpression: integer("overall_impression").notNull(),
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

// ── athlete_notes (append-only timestamped coach log; Notities tab) ────────────
export const athleteNotes = pgTable("athlete_notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  athleteId: uuid("athlete_id")
    .notNull()
    .references(() => athletes.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── Relations ─────────────────────────────────────────────────────────────────
export const athletesRelations = relations(athletes, ({ many }) => ({
  athleteKata: many(athleteKata),
  scoringCards: many(kataScoringCards),
  feedbackForms: many(feedbackForms),
  competitionEntries: many(competitionEntries),
  notes: many(athleteNotes),
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
