// Drizzle schema — source of truth for DB tables.
//
// Intentionally empty at Ch1 so the migration pipeline (`pnpm db:generate` /
// `pnpm db:migrate`) wires up cleanly. Ch2 adds: athletes, kata, athlete_kata,
// kata_scoring_cards, feedback_forms, competitions, competition_entries, plus
// the Better Auth tables (user/session/account/verification).
export {};
