import { Document, Page, Text, View } from "@react-pdf/renderer";
import type { Messages } from "@/messages";
import type { AthleteStats } from "@/lib/athlete-stats";
import type { Category } from "@/lib/categories";
import { DocHeader, Field, Footer, SectionTitle, StatRow, styles } from "./styles";

// Athlete one-pager PDF (Ch11): the Overzicht tab in print form. Used by the
// coach route and (token-validated) the public portal route — renders only the
// athlete-facing `AthleteStats` + physical profile (no coach-private notes).

type Athlete = {
  firstName: string;
  lastName: string;
  beltRank: string;
  heightCm: number | null;
  weightKg: number | null;
  yearsTraining: number;
  yearsCompeting: number | null;
  physicalNotes: string | null;
};

export function AthleteDocument({
  athlete,
  age,
  categories,
  stats,
  m,
  includePhysicalNotes = false,
}: {
  athlete: Athlete;
  age: number;
  categories: Category[];
  stats: AthleteStats;
  m: Messages;
  includePhysicalNotes?: boolean;
}) {
  const o = m.athlete.overview;
  const comp = stats.competition;
  const name = `${athlete.firstName} ${athlete.lastName}`;
  const subtitle = `${name} · ${age} ${m.common.year} · ${athlete.beltRank} · ${categories.join(", ")}`;

  return (
    <Document
      title={`${m.pdf.athleteTitle} — ${name}`}
      author={m.app.name}
    >
      <Page size="A4" style={styles.page}>
        <DocHeader m={m} title={m.pdf.athleteTitle} subtitle={subtitle} />

        <View style={styles.twoCol}>
          <View style={styles.col}>
            <View style={styles.section} wrap={false}>
              <SectionTitle>{o.physical}</SectionTitle>
              <StatRow
                label={o.height}
                value={athlete.heightCm ? `${athlete.heightCm} cm` : o.none}
              />
              <StatRow
                label={o.weight}
                value={athlete.weightKg ? `${athlete.weightKg} kg` : o.none}
              />
              <StatRow
                label={m.athlete.fields.yearsTraining}
                value={athlete.yearsTraining}
              />
              {athlete.yearsCompeting != null ? (
                <StatRow
                  label={m.athlete.fields.yearsCompeting}
                  value={athlete.yearsCompeting}
                />
              ) : null}
              {includePhysicalNotes ? (
                <Field
                  label={m.athlete.fields.physicalNotes}
                  value={athlete.physicalNotes}
                />
              ) : null}
            </View>

            <View style={styles.section} wrap={false}>
              <SectionTitle>{o.stats}</SectionTitle>
              {comp.totalEvents === 0 ? (
                <Text style={styles.muted}>{o.noCompetitions}</Text>
              ) : (
                <>
                  <StatRow
                    label={o.totalCompetitions}
                    value={comp.totalEvents}
                  />
                  <StatRow
                    label={o.podium}
                    value={`${comp.podium.first}/${comp.podium.second}/${comp.podium.third}`}
                  />
                  <StatRow label={o.mostKata} value={comp.mostKata ?? o.none} />
                  {comp.byType.map((tp) => (
                    <StatRow
                      key={tp.type}
                      label={m.competition.types[tp.type]}
                      value={tp.count}
                    />
                  ))}
                  {comp.rounds.map((r) => (
                    <StatRow
                      key={r.labelKey}
                      label={m.competition.rounds[r.labelKey]}
                      value={`${r.wins}-${r.losses}`}
                    />
                  ))}
                </>
              )}
            </View>
          </View>

          <View style={styles.col}>
            <View style={styles.section} wrap={false}>
              <SectionTitle>{o.currentRepertoire}</SectionTitle>
              {stats.repertoire.length === 0 ? (
                <Text style={styles.muted}>{o.noRepertoire}</Text>
              ) : (
                stats.repertoire.map((k) => (
                  <StatRow
                    key={k.kataName}
                    label={k.kataName}
                    value={`${m.kata.proficiency} ${k.proficiency ?? "—"}`}
                  />
                ))
              )}
            </View>

            <View style={styles.section} wrap={false}>
              <SectionTitle>{o.activeGoals}</SectionTitle>
              {!stats.goals ? (
                <Text style={styles.muted}>{o.noGoals}</Text>
              ) : (
                <>
                  <Field
                    label={m.feedback.fields.goalMain}
                    value={stats.goals.goalMain}
                  />
                  <Field
                    label={m.feedback.fields.goalPerformance}
                    value={stats.goals.goalPerformance}
                  />
                  <Field
                    label={m.feedback.fields.goalOutcome}
                    value={stats.goals.goalOutcome}
                  />
                  <Field
                    label={m.feedback.fields.kataFocus}
                    value={stats.goals.kataFocus}
                  />
                </>
              )}
            </View>

            <View style={styles.section}>
              <SectionTitle>{o.focusPoints}</SectionTitle>
              {stats.focusPoints.length === 0 ? (
                <Text style={styles.muted}>{o.noFocus}</Text>
              ) : (
                stats.focusPoints.map((p) => (
                  <Text key={p} style={{ fontSize: 9, marginBottom: 3 }}>
                    • {p}
                  </Text>
                ))
              )}
            </View>
          </View>
        </View>
        <Footer m={m} />
      </Page>
    </Document>
  );
}
