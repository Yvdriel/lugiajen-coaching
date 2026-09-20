---
status: accepted
---

# Methodology lives in git skills, athlete state lives in the database behind MCP

The old setup kept training methodology and athlete context together as markdown in a Claude project, which meant every training or competition forced a manual edit of those files. We split it: methodology (VLI manual, periodization, workout catalog, coaching philosophy, Shotokan kata reference, planning workflow) is prose that changes rarely, so it lives in this repo under `.claude/skills/` and is versioned like code; everything that changes per training (plans, sessions, blocks, learnings, timings, availability) lives in Postgres and is read and written by Claude Code through an HTTP MCP route in this app. Learnings are the only AI-written memory, appended freely with `author: ai`, deleted by the coach, never edited.

## Considered options

- Everything in the database, methodology served as MCP resources. Rejected: no gain over files Claude Code already reads, and editing prose through a database is worse than editing it in git.
- Everything in markdown, as before. Rejected: that is the manual-edit burden this replaces, and VLI arithmetic over markdown is not queryable.
- Local stdio MCP hitting the database directly. Rejected: bypasses the app's validation and puts production credentials on every machine.

## Consequences

- Skills are repo-scoped; planning happens from a checkout of this repo.
- Feedback gesprekken stay app-UI writes (the athlete fills their side through the portal); MCP reads them. Competitions, entries, scoring cards and repertoire are writable through MCP since 2026-09-20, so a post-training or post-competition conversation can land its data without switching to the app.
- A coach who wants to change methodology edits markdown and commits, same as any code change.
