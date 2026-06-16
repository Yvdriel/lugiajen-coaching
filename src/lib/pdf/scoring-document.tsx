import { Document, Page, Text, View } from "@react-pdf/renderer";
import { CRITERION_GROUPS, criteriaForGroup } from "@/features/scoring/criteria";
import { formatDate } from "@/i18n/format";
import type { Locale, Messages } from "@/messages";
import type { ScoringCardRow } from "@/lib/queries/scoring";
import { DocHeader, Field, Footer, SectionTitle, StatRow, styles } from "./styles";

// Scoring-card summary PDF (Ch11), per kata. Coach-only route. Latest card's 13
// criteria grouped technical/athletic/overall + notes + a compact overall trend.

type Athlete = { firstName: string; lastName: string };

export function ScoringDocument({
  athlete,
  kataName,
  history,
  m,
  locale,
}: {
  athlete: Athlete;
  kataName: string;
  history: ScoringCardRow[];
  m: Messages;
  locale: Locale;
}) {
  const latest = history[0] ?? null;
  const name = `${athlete.firstName} ${athlete.lastName}`;
  const title = `${m.pdf.scoringTitle} — ${kataName}`;
  const subtitle = latest
    ? `${name} · ${formatDate(latest.assessmentDate, locale)}`
    : name;

  return (
    <Document title={`${title} — ${name}`} author={m.app.name}>
      <Page size="A4" style={styles.page}>
        <DocHeader m={m} title={title} subtitle={subtitle} />

        {!latest ? (
          <Text style={styles.muted}>{m.scoring.noCards}</Text>
        ) : (
          <>
            <View style={styles.twoCol}>
              {CRITERION_GROUPS.map((g) => (
                <View key={g} style={styles.col}>
                  <View style={styles.section} wrap={false}>
                    <SectionTitle>{m.scoring.groups[g]}</SectionTitle>
                    {criteriaForGroup(g).map((c) => (
                      <StatRow
                        key={c.key}
                        label={m.scoring.criteria[c.key]}
                        value={`${latest[c.key]} / 100`}
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
                <SectionTitle>{m.scoring.title}</SectionTitle>
                <Field
                  label={m.scoring.textFields.strengths}
                  value={latest.strengths}
                />
                <Field
                  label={m.scoring.textFields.priorityImprovements}
                  value={latest.priorityImprovements}
                />
                <Field
                  label={m.scoring.textFields.kataSpecificNotes}
                  value={latest.kataSpecificNotes}
                />
                <Field
                  label={m.scoring.textFields.coachNotes}
                  value={latest.coachNotes}
                />
              </View>
            ) : null}

            {history.length >= 2 ? (
              <View style={styles.section}>
                <SectionTitle>{m.scoring.charts.trend}</SectionTitle>
                {history.map((card) => (
                  <StatRow
                    key={card.id}
                    label={formatDate(card.assessmentDate, locale)}
                    value={`${card.overallImpression} / 100`}
                  />
                ))}
              </View>
            ) : null}
          </>
        )}
        <Footer m={m} />
      </Page>
    </Document>
  );
}
