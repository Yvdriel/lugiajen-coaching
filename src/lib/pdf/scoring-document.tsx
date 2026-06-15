import { Document, Page, Text, View } from "@react-pdf/renderer";
import { CRITERION_GROUPS, criteriaForGroup } from "@/features/scoring/criteria";
import type { ScoringCardRow } from "@/lib/queries/scoring";
import { nl } from "@/messages/nl";
import { DocHeader, Field, Footer, SectionTitle, StatRow, styles } from "./styles";

// Scoring-card summary PDF (Ch11), per kata. Coach-only route. Latest card's 13
// criteria grouped technical/athletic/overall + notes + a compact overall trend.

type Athlete = { firstName: string; lastName: string };

function fmtDate(d: string): string {
  return new Date(d).toLocaleDateString("nl-NL");
}

export function ScoringDocument({
  athlete,
  kataName,
  history,
}: {
  athlete: Athlete;
  kataName: string;
  history: ScoringCardRow[];
}) {
  const latest = history[0] ?? null;
  const name = `${athlete.firstName} ${athlete.lastName}`;
  const title = `${nl.pdf.scoringTitle} — ${kataName}`;
  const subtitle = latest
    ? `${name} · ${fmtDate(latest.assessmentDate)}`
    : name;

  return (
    <Document title={`${title} — ${name}`} author={nl.app.name}>
      <Page size="A4" style={styles.page}>
        <DocHeader title={title} subtitle={subtitle} />

        {!latest ? (
          <Text style={styles.muted}>{nl.scoring.noCards}</Text>
        ) : (
          <>
            <View style={styles.twoCol}>
              {CRITERION_GROUPS.map((g) => (
                <View key={g} style={styles.col}>
                  <View style={styles.section} wrap={false}>
                    <SectionTitle>{nl.scoring.groups[g]}</SectionTitle>
                    {criteriaForGroup(g).map((c) => (
                      <StatRow
                        key={c.key}
                        label={nl.scoring.criteria[c.key]}
                        value={`${latest[c.key]} / 10`}
                      />
                    ))}
                  </View>
                </View>
              ))}
            </View>

            {latest.strengths ||
            latest.priorityImprovements ||
            latest.kataSpecificNotes ||
            latest.coachNotes ? (
              <View style={styles.section}>
                <SectionTitle>{nl.scoring.title}</SectionTitle>
                <Field
                  label={nl.scoring.textFields.strengths}
                  value={latest.strengths}
                />
                <Field
                  label={nl.scoring.textFields.priorityImprovements}
                  value={latest.priorityImprovements}
                />
                <Field
                  label={nl.scoring.textFields.kataSpecificNotes}
                  value={latest.kataSpecificNotes}
                />
                <Field
                  label={nl.scoring.textFields.coachNotes}
                  value={latest.coachNotes}
                />
              </View>
            ) : null}

            {history.length >= 2 ? (
              <View style={styles.section}>
                <SectionTitle>{nl.scoring.charts.trend}</SectionTitle>
                {history.map((card) => (
                  <StatRow
                    key={card.id}
                    label={fmtDate(card.assessmentDate)}
                    value={`${card.overallImpression} / 10`}
                  />
                ))}
              </View>
            ) : null}
          </>
        )}
        <Footer />
      </Page>
    </Document>
  );
}
