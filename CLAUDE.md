# Lu Gia Jen — Karate Coaching Platform

## Project Overview

Build a web application for managing competitive karate (WKF Shotokan kata) athlete development. The primary user is a karate coach who manages athletes aged 9-21+, tracks their progress through feedback forms, kata scoring cards, competition history, and training goals. Athletes (or their parents) can view their own profile and feedback history through a shared link.

This is a real coaching tool for Lu Gia Jen, a Dutch Shotokan karate club. All athlete-facing text must be in Dutch. Coach-facing UI can be in Dutch or English (prefer Dutch for consistency).

## Tech Stack

- **Framework:** Next.js (latest, App Router)
- **Styling:** Tailwind CSS (latest) + shadcn/ui (latest)
- **Database:** PostgreSQL (hosted on Neon, Supabase, or Vercel Postgres)
- **ORM:** Drizzle ORM
- **Auth:** Better Auth (self-hosted, email/password for coach accounts)
- **Deployment:** Vercel
- **PDF Generation:** @react-pdf/renderer (for printable forms)

## Brand Identity

The club's visual identity is monochrome — black, white, and grays. Clean, minimal, martial-arts aesthetic. No bright accent colors. Use the following palette:

```
--brand-black: #000000
--brand-near-black: #1a1a1a
--brand-dark-gray: #333333
--brand-mid-gray: #777777
--brand-soft-gray: #aaaaaa
--brand-rule-gray: #cccccc
--brand-field-bg: #f5f5f5
--brand-white: #ffffff
```

Typography: clean sans-serif (Inter or system font stack). The app should feel professional and understated — it's a tool, not a marketing site.

## Authentication & Authorization

### Roles
1. **Coach** — full access. Can create/edit athletes, create feedback, manage competitions, view all data. Authenticated via Better Auth email/password login.
2. **Athlete Viewer** — read-only access to their own profile. Accessed via a unique hashed URL (no login required). The URL contains a non-guessable token (e.g., `/athlete/view/{uuid-token}`). This link can be shared with the athlete or their parents.

### Coach Setup
- The system supports a single coach (or a small number of coaches). No public registration — coach accounts are seeded or created via an invite flow.
- After login, the coach lands on a dashboard showing their athletes, upcoming competitions, and recent activity.

## Data Model

### Athletes

```
athletes
  id: uuid (PK)
  first_name: text
  last_name: text
  date_of_birth: date
  gender: enum('male', 'female')
  belt_rank: text (e.g., "Shodan", "3e kyu")
  years_training: integer
  years_competing: integer (nullable)
  height_cm: integer (nullable)
  weight_kg: integer (nullable)
  notes: text (nullable, general coach notes)
  physical_notes: text (nullable, injuries/limitations/flexibility notes)
  view_token: text (unique, auto-generated uuid for athlete portal link)
  is_active: boolean (default true)
  created_at: timestamp
  updated_at: timestamp
```

**Computed fields (derived, not stored):**
- `age`: calculated from date_of_birth
- `categories`: derived from age using WKF age rules:
  - U12: under 12
  - U14: 12-13
  - Cadets: 14-15
  - Juniors: 16-17
  - U21: 18-20
  - Senior: 21+
  Note: An athlete can compete in their own category AND the one above (e.g., a 17-year-old Junior can also compete U21). The system should show all eligible categories.

### Kata Library (Pre-seeded)

```
kata
  id: uuid (PK)
  name: text (e.g., "Gojushiho Sho")
  category: enum('competition', 'development') 
  split_quarter: boolean (can be split into 1/4)
  split_third: boolean (can be split into 1/3)
  split_half: boolean (can be split into 1/2)
  flexibility_category: enum('A', 'B', 'C') -- A=1/4 possible, B=1/3 min, C=1/2 min
  sort_order: integer
```

Pre-seed with ALL Shotokan kata relevant to competition and development:

**Competition kata (category: 'competition'):**
| Name | 1/4 | 1/3 | 1/2 | Flex Category |
|---|---|---|---|---|
| Gojushiho Sho | yes | yes | yes | A |
| Gojushiho Dai | yes | yes | yes | A |
| Kanku Sho | yes | yes | yes | A |
| Kanku Dai | no | yes | yes | B |
| Sochin | no | yes | yes | B |
| Unsu | no | yes | yes | B |
| Enpi | no | yes | yes | B |
| Gankaku | no | yes | yes | B |

**Development kata (category: 'development'):**
| Name | 1/4 | 1/3 | 1/2 | Flex Category |
|---|---|---|---|---|
| Heian Shodan | no | no | yes | C |
| Heian Nidan | no | no | yes | C |
| Heian Sandan | no | no | yes | C |
| Heian Yondan | no | no | yes | C |
| Heian Godan | no | no | yes | C |
| Tekki Shodan | no | no | yes | C |
| Bassai Dai | no | yes | yes | B |
| Jion | no | yes | yes | B |
| Jitte | no | yes | yes | B |
| Hangetsu | no | yes | yes | B |
| Nijushiho | no | yes | yes | B |
| Meikyo | no | yes | yes | B |
| Chinte | no | yes | yes | B |
| Bassai Sho | no | yes | yes | B |
| Wankan | no | no | yes | C |

### Athlete Kata (which kata each athlete trains/competes with)

```
athlete_kata
  id: uuid (PK)
  athlete_id: uuid (FK -> athletes)
  kata_id: uuid (FK -> kata)
  round_order: integer (nullable, competition round order: 1st kata, 2nd kata, etc.)
  is_competition_kata: boolean (is this in their active competition repertoire?)
  proficiency: integer (1-10, coach rating)
  notes: text (nullable, strengths/weaknesses for this kata)
  created_at: timestamp
  updated_at: timestamp
```

### Kata Scoring Cards

The scoring card tracks WKF judging criteria per athlete per kata. Each save creates a snapshot that preserves history.

```
kata_scoring_cards
  id: uuid (PK)
  athlete_id: uuid (FK -> athletes)
  kata_id: uuid (FK -> kata)
  assessment_date: date
  
  -- WKF Technical Performance criteria (1-10 each)
  stances: integer
  techniques: integer
  transitions: integer
  timing: integer
  breathing: integer
  kiai: integer
  kime: integer
  conformance: integer  -- adherence to kata's standard form
  
  -- WKF Athletic Performance criteria (1-10 each)
  strength: integer
  speed: integer
  balance: integer
  rhythm: integer
  
  -- Overall impression
  overall_impression: integer (1-10)
  
  -- Kata-specific notes
  kata_specific_notes: text (nullable, for things unique to this kata, e.g., "jump height in Unsu", "crane stance in Gankaku")
  priority_improvements: text (nullable, top 1-3 things to focus on)
  strengths: text (nullable)
  
  coach_notes: text (nullable)
  created_at: timestamp
```

**History tracking:** Every time a scoring card is saved for the same athlete+kata combination, it creates a NEW row (not an update). This preserves full history. The UI shows the latest scores with change indicators compared to the previous assessment, and a timeline/chart showing progression of each criterion over time.

### Feedback Forms (Parent Meeting Forms)

```
feedback_forms
  id: uuid (PK)
  athlete_id: uuid (FK -> athletes)
  form_type: enum('U12', 'U16') -- determines which template/fields
  meeting_number: integer (1, 2, or 3 for the season)
  meeting_date: date
  season: text (e.g., "2026/2027")
  
  -- Side A: Athlete self-assessment (filled in by athlete or transcribed by coach)
  athlete_proud_of: text (nullable)
  athlete_hardest_thing: text (nullable)
  athlete_show_parents: text (nullable, U12 only)
  athlete_fun_score: integer (nullable, 1-5, U12 only)
  athlete_make_more_fun: text (nullable, U12 only)
  athlete_question: text (nullable)
  
  -- U16 specific self-assessment fields
  self_rating_training: integer (nullable, 1-5, U16 only)
  self_rating_motivation: integer (nullable, 1-5, U16 only)
  self_rating_body: integer (nullable, 1-5, U16 only)
  self_rating_competition: integer (nullable, 1-5, U16 only)
  athlete_needs_work: text (nullable, U16 only)
  
  -- Side B: Coach feedback (filled in during meeting)
  coach_strength: text (nullable)
  coach_development_area: text (nullable)
  
  -- Goals
  goal_main: text (nullable, U12: single goal / U16: process goal)
  goal_performance: text (nullable, U16 only)
  goal_outcome: text (nullable, U16 only)
  kata_focus: text (nullable, U16 only)
  
  -- Action items (up to 3)
  action_1: text (nullable)
  action_2: text (nullable)
  action_3: text (nullable)
  
  created_at: timestamp
  updated_at: timestamp
```

### Competitions

```
competitions
  id: uuid (PK)
  name: text (e.g., "JKA Nationals 2026", "Hayashi International Cup")
  date: date
  location: text (nullable)
  competition_type: enum('club', 'regional', 'national', 'international')
  notes: text (nullable)
  created_at: timestamp
```

### Competition Entries (links athletes to competitions)

```
competition_entries
  id: uuid (PK)
  competition_id: uuid (FK -> competitions)
  athlete_id: uuid (FK -> athletes)
  category: text (e.g., "U14 Kata Individual", "Senior Kata Individual")
  
  -- Results
  result_placement: integer (nullable, 1=first, 2=second, etc.)
  result_round_reached: text (nullable, e.g., "Ronde 1", "Kwartfinale", "Halve finale", "Finale")
  
  -- Kata performed per round
  kata_round_1: uuid (nullable, FK -> kata)
  kata_round_1_result: enum('win', 'loss', null)
  kata_round_2: uuid (nullable, FK -> kata)
  kata_round_2_result: enum('win', 'loss', null)
  kata_round_3: uuid (nullable, FK -> kata)
  kata_round_3_result: enum('win', 'loss', null)
  kata_round_4: uuid (nullable, FK -> kata)
  kata_round_4_result: enum('win', 'loss', null)
  kata_final: uuid (nullable, FK -> kata)
  kata_final_result: enum('win', 'loss', null)
  
  -- Competition-specific feedback
  feedback_before: text (nullable, how they felt/prepared)
  feedback_performance: text (nullable, what went well)
  feedback_improvement: text (nullable, what to work on)
  feedback_lesson: text (nullable, key takeaway — ownership framing)
  
  coach_notes: text (nullable)
  created_at: timestamp
  updated_at: timestamp
```

## Pages & UI Structure

### Coach Dashboard (`/dashboard`)
- Welcome message
- Quick stats: total active athletes, upcoming competitions, recent activity
- List of athletes as cards (name, age, category, belt, days since last feedback)
- "Nieuwe atleet" button
- "Nieuwe wedstrijd" button
- Recent feedback forms and scoring cards (last 5-10)

### Athlete List (`/athletes`)
- Filterable/searchable table of all athletes
- Filter by: category (U12/U14/Cadets/Juniors/U21/Senior), active/inactive, belt rank
- Sort by: name, age, last feedback date, number of competitions
- Click athlete → athlete profile

### Athlete Profile (`/athletes/[id]`)
This is the most important page. It should have a tabbed or sectioned layout:

**Header:** Name, age, category badges, belt rank, photo placeholder, "Deel link" button (copies the athlete viewer URL)

**Tab: Overzicht (Overview / Stats)**
- At-a-glance stats panel:
  - Total competitions entered
  - Podium finishes (1st, 2nd, 3rd with counts)
  - Win/loss ratio per round
  - Competitions by type (club/regional/national/international)
  - Most performed kata in competition
  - Current competition kata repertoire with proficiency ratings
- Active goals (from most recent feedback form)
- Physical profile summary (height, weight, physical notes/limitations)
- Current focus points (from most recent feedback and scoring cards)

**Tab: Kata**
- Grid/list of all assigned kata with:
  - Name, flexibility category badge (A/B/C), competition round order
  - Current proficiency (1-10)
  - Latest scoring card summary (sparkline or mini bar chart of criteria)
  - "Bekijk scorekaart" button → opens scoring card detail/history
  - "Nieuwe beoordeling" button → create new scoring card entry

**Tab: Scorekaarten (Scoring Cards)**
- Per-kata scoring card history
- Select a kata → see:
  - Latest scores in a radar/spider chart
  - Score history table showing all assessments with dates
  - Per-criterion trend lines (line chart showing how each score changed over time)
  - Change indicators: arrows or color-coded deltas (green for improvement, red for decline)
  - Bulk view: a single table showing ALL criteria across ALL assessment dates so you can see the full progression at a glance
  - Priority improvements from the latest card
- "Nieuwe beoordeling" button opens a form to score all criteria

**Tab: Feedback**
- Chronological list of all parent meeting feedback forms
- Each entry shows: date, meeting number, season, form type (U12/U16)
- Click to expand and see full form content
- "Nieuw feedback gesprek" button → opens the appropriate form (U12 or U16 based on athlete age)
- Print button → generates PDF matching the Lu Gia Jen branded form design

**Tab: Wedstrijden (Competitions)**
- Chronological list of all competitions this athlete participated in
- Each entry shows: date, event name, category, katas performed, result, round reached
- Click to expand for full feedback
- Summary stats at top: total events, podium count, most successful kata

**Tab: Notities (Notes)**
- Free-form coach notes area
- Timestamped entries (simple append-only log)
- For quick observations that don't fit into structured forms

### Kata Scoring Card Form (`/athletes/[id]/kata/[kataId]/score`)
- Form with all criteria as number inputs (1-10) or slider/stepper controls
- If previous assessment exists, show the previous score next to each input field as reference (grayed out)
- Change indicator: if the new score differs from the previous, show an arrow (↑↓→) and the delta
- Kata-specific notes, strengths, priority improvements as text areas
- Save creates a new snapshot (append, never update)

### Feedback Form (`/athletes/[id]/feedback/new`)
- Dynamically renders U12 or U16 form based on athlete's age
- Form fields match the database schema above
- Side A and Side B as two sections or steps
- Can be filled in live during the meeting (coach types as athlete speaks)
- Save and optionally generate printable PDF

### Competition Management (`/competitions`)
- List of all competitions
- "Nieuwe wedstrijd" button → create competition (name, date, location, type)
- Click competition → detail page showing all participating athletes and results

### Competition Detail (`/competitions/[id]`)
- Competition info header
- "Atleet toevoegen" button → select from athlete list, assign category
- For each athlete entry:
  - Category, kata per round (select from their repertoire), result per round
  - Placement
  - Feedback fields (before, performance, improvement, lesson)
- Useful for filling in live at a competition or shortly after

### Athlete Viewer Portal (`/athlete/view/[token]`)
- Public (no auth), accessed via the unique hashed link
- Read-only view of the athlete's profile
- Shows: overview stats, kata scoring card history with charts, feedback form history, competition history
- Clean, branded presentation — this is what the athlete and parents see
- No edit capabilities
- Page header: "Atleetprofiel — [Name]" with Lu Gia Jen branding

### Print / PDF Export
- Feedback forms should be exportable as PDF matching the branded A4 form design we created
- Scoring cards should be printable as a clean summary page
- Athlete overview should be printable as a one-page summary

## Key UI/UX Patterns

### Scoring Card History Display
When viewing a kata's scoring card history, the most important visualization is the **change over time**. Design this as:

1. **Current scores** shown as a horizontal bar chart or radar chart
2. **History table** below with one row per assessment date, all criteria as columns, cells color-coded:
   - Green background: improved from previous
   - Red background: declined from previous
   - No color: unchanged
   - Show the actual delta (e.g., "+1", "-2") in small text
3. **Trend sparklines** for each criterion (tiny line charts showing the trajectory)

This allows the coach to see at a glance: "kime has been steadily improving, but balance dropped last month."

### Form Auto-Detection
When creating a new feedback form, automatically select U12 or U16 template based on the athlete's current age. Allow manual override (some athletes may mature differently).

### Competition Flow
Design the competition entry as a wizard/stepper:
1. Select or create competition
2. Add athletes (multi-select from roster)
3. For each athlete: assign category, select katas for each round
4. After competition: fill in results (round reached, placement)
5. For each athlete: fill in feedback (can be done later)

### Responsive Design
The app will be used:
- On a laptop at home for planning and review
- On a phone/tablet at the dojo during training
- On a phone at competitions for quick result entry

Prioritize mobile-friendly forms for the scoring card and competition entry flows.

## Seed Data

Create a database seed script that:
1. Seeds all Shotokan kata listed above
2. Creates a demo coach account
3. Optionally creates a sample athlete with sample data for development/testing

## Implementation Notes

### File Structure
```
src/
  app/
    (auth)/
      login/
      page.tsx
    (coach)/
      dashboard/
        page.tsx
      athletes/
        page.tsx
        [id]/
          page.tsx
          kata/
            [kataId]/
              score/
                page.tsx
          feedback/
            new/
              page.tsx
            [feedbackId]/
              page.tsx
          competitions/
            page.tsx
      competitions/
        page.tsx
        [id]/
          page.tsx
        new/
          page.tsx
      layout.tsx
    athlete/
      view/
        [token]/
          page.tsx
    api/
      [...] (API routes for data operations)
  components/
    ui/ (shadcn components)
    forms/
      feedback-form-u12.tsx
      feedback-form-u16.tsx
      scoring-card-form.tsx
      competition-entry-form.tsx
    charts/
      radar-chart.tsx (for scoring card visualization)
      trend-sparkline.tsx
      score-history-table.tsx
    athlete/
      athlete-card.tsx
      athlete-header.tsx
      stats-overview.tsx
    competition/
      competition-card.tsx
      competition-wizard.tsx
    layout/
      sidebar.tsx
      nav.tsx
  db/
    schema.ts (Drizzle schema)
    index.ts (Drizzle client)
    seed.ts
  lib/
    auth.ts (Better Auth config)
    utils.ts
    categories.ts (age -> category calculation logic)
    pdf/ (PDF generation templates)
```

### Category Calculation Logic
```typescript
function getCategories(dateOfBirth: Date): string[] {
  const age = calculateAge(dateOfBirth);
  const categories: string[] = [];
  
  if (age < 12) categories.push('U12');
  if (age >= 12 && age <= 13) categories.push('U14');
  if (age >= 14 && age <= 15) categories.push('Cadets');
  if (age >= 16 && age <= 17) categories.push('Juniors');
  if (age >= 18 && age <= 20) categories.push('U21');
  if (age >= 21) categories.push('Senior');
  
  // Athletes can also compete one category up
  if (age >= 11 && age <= 12) categories.push('U14');
  if (age >= 13 && age <= 14) categories.push('Cadets');
  if (age >= 15 && age <= 16) categories.push('Juniors');
  if (age >= 17 && age <= 18) categories.push('U21');
  if (age >= 20 && age <= 21) categories.push('Senior');
  
  return [...new Set(categories)]; // deduplicate
}
```

### Performance Considerations
- Use server components for data display pages
- Client components only for interactive forms and charts
- Use React Server Actions for form submissions
- Paginate competition and feedback lists for athletes with long histories
- Consider ISR for the public athlete viewer portal

## What to Build First (Priority Order)

1. **Database schema + seed script** — get the data model right first
2. **Auth + basic layout** — coach login, sidebar navigation, dashboard shell
3. **Athlete CRUD** — create, edit, list, profile page with tabs
4. **Kata scoring cards** — the form, history tracking, change visualization
5. **Feedback forms** — U12 and U16 variants, save and display
6. **Competition management** — competition CRUD, athlete linking, results
7. **Athlete stats overview** — the computed stats panel on the athlete profile
8. **Athlete viewer portal** — the public read-only view
9. **PDF export** — printable versions of feedback forms and scoring cards
10. **Polish** — mobile optimization, loading states, error handling

## Non-Functional Requirements

- All data must be properly validated server-side (zod schemas)
- All form submissions use server actions with optimistic updates where appropriate
- Proper error handling and loading states on all async operations  
- The app should work offline-tolerant for competition day (consider service worker or local state)
- Database backups should be considered for production deployment
- Rate limit the public athlete viewer portal to prevent abuse

---

> **Build execution:** see [`BUILD-PLAN.md`](./BUILD-PLAN.md) — the spec above is decomposed into 12 ordered, checkbox-tracked chapters (one per Claude session). Start each session from the lowest undone chapter there.
