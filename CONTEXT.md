# Lu Gia Jen Coaching

Coaching platform for WKF Shotokan kata athletes at Lu Gia Jen. Tracks athlete
development (scoring, feedback, competitions) and, with the training module,
plans and logs training using the Torres / del Moral VLI method.

## Language

### Training

**Plan**:
An intended training period for one athlete, usually aimed at a target competition.
_Avoid_: Schema, program, schedule

**Session**:
One training on one date for one athlete. Assumed done once its date has passed unless marked skipped.
_Avoid_: Training, workout (see below)

**Block**:
One unit inside a session: one kata, one split, the sections trained, reps, rest.
_Avoid_: Exercise, set, drill

**Split**:
How a kata is cut for training: full, half, third, quarter. Which splits a kata allows is fixed by its flexibility category.
_Avoid_: Part, division

**Section**:
One piece of a kata under a split, named by index and split: 2/4, 3/3, 1/2. Full kata is section 1/1.
_Avoid_: Part, Q1, phase

**Workout**:
The sixth part of a session in the Karate Classroom session architecture (quarter kata, EMOM, beginning blast, circuit, vest). Never a synonym for session.

**Volume**:
Total reps of any section or full kata in a session or period.

**Load**:
Full-kata equivalents: reps multiplied by section fraction, summed. Ten per kata per session is the sustainable ceiling.

**Intensity**:
Derived 1 to 5 rating from section size and rest length. Never entered by hand.

**VLI**:
Volume, Load, Intensity together. The training load model this platform uses.

**Section timing**:
Measured seconds one athlete needs for one section of one kata. Used to estimate session duration.

**Athlete notes**:
The athlete's own words on a Session, written from the portal after training. Distinct from a Session's notes (coach or AI written, athlete-visible) and coach notes (coach only).

**Agenda**:
The chronological list of an athlete's Sessions across weeks, independent of any Plan.

**Availability**:
An athlete's weekly training slots: weekday, minutes, kind, whether coach-led.

### Knowledge

**Learning**:
A dated insight about one athlete, or about coaching in general when no athlete is set. Written by coach or AI, never edited, only deleted.
_Avoid_: Note (that is the free-form athlete_notes log), memory, insight

**Methodology**:
The written training references (VLI manual, periodization, workout catalog, coaching philosophy, Shotokan kata reference). Lives in git as skills, not in the database.
_Avoid_: References, knowledge base, project docs

### Existing

**Scoring card**:
Append-only WKF criteria assessment of one athlete on one kata at one date.

**Feedback gesprek**:
Parent meeting form (U12 / CADET / JUNIOR / SENIOR) with goals and action items.

**Repertoire**:
The kata an athlete trains, with round order for those used in competition.
