import { Document, Page, View } from "@react-pdf/renderer";
import type { FeedbackRow } from "@/lib/queries/feedback";
import { nl } from "@/messages/nl";
import { feedbackSections } from "./feedback-sections";
import { DocHeader, Field, Footer, SectionTitle, styles } from "./styles";

// Branded A4 feedback-form PDF (Ch11). Server-only. Mirrors `feedback-detail`.

type Athlete = { firstName: string; lastName: string };

function fmtDate(d: string): string {
  return new Date(d).toLocaleDateString("nl-NL");
}

export function FeedbackDocument({
  athlete,
  form,
}: {
  athlete: Athlete;
  form: FeedbackRow;
}) {
  const sections = feedbackSections(form);
  const name = `${athlete.firstName} ${athlete.lastName}`;
  const subtitle = `${name} · ${nl.feedback.meeting} ${form.meetingNumber} · ${fmtDate(form.meetingDate)} · ${form.season} · ${form.formType}`;

  return (
    <Document title={`${nl.pdf.feedbackTitle} — ${name}`} author={nl.app.name}>
      <Page size="A4" style={styles.page}>
        <DocHeader title={nl.pdf.feedbackTitle} subtitle={subtitle} />
        {sections.map((s) => (
          <View key={s.title} style={styles.section} wrap={false}>
            <SectionTitle>{s.title}</SectionTitle>
            <View style={styles.twoCol}>
              {s.fields.map((f) => (
                <View key={f.label} style={styles.col}>
                  <Field label={f.label} value={f.value} />
                </View>
              ))}
            </View>
          </View>
        ))}
        <Footer />
      </Page>
    </Document>
  );
}
