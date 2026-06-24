import { Document, Page, View } from "@react-pdf/renderer";
import { formatDate } from "@/i18n/format";
import type { Locale, Messages } from "@/messages";
import type {
  FeedbackActionRow,
  FeedbackGoalRow,
  FeedbackKataRatingRow,
  FeedbackRow,
} from "@/lib/queries/feedback";
import { feedbackSections } from "./feedback-sections";
import { DocHeader, Field, Footer, SectionTitle, styles } from "./styles";

// Branded A4 feedback-form PDF (Ch11). Server-only. Mirrors `feedback-detail`.
// Localized: route handler passes the active `m` (messages) + `locale`.

type Athlete = { firstName: string; lastName: string };

export function FeedbackDocument({
  athlete,
  form,
  kataRatings = [],
  goals = [],
  actions = [],
  m,
  locale,
}: {
  athlete: Athlete;
  form: FeedbackRow;
  kataRatings?: FeedbackKataRatingRow[];
  goals?: FeedbackGoalRow[];
  actions?: FeedbackActionRow[];
  m: Messages;
  locale: Locale;
}) {
  const sections = feedbackSections(form, m, kataRatings, goals, actions);
  const name = `${athlete.firstName} ${athlete.lastName}`;
  const subtitle = `${name} · ${m.feedback.meeting} ${form.meetingNumber} · ${formatDate(form.meetingDate, locale)} · ${form.season} · ${form.formType}`;

  return (
    <Document title={`${m.pdf.feedbackTitle} — ${name}`} author={m.app.name}>
      <Page size="A4" style={styles.page}>
        <DocHeader m={m} title={m.pdf.feedbackTitle} subtitle={subtitle} />
        {sections.map((s) => (
          <View key={s.title} style={styles.section} wrap={false}>
            <SectionTitle>{s.title}</SectionTitle>
            <View style={styles.twoCol}>
              {s.fields.map((f, i) => (
                <View key={`${f.label}-${i}`} style={styles.col}>
                  <Field label={f.label} value={f.value} />
                </View>
              ))}
            </View>
          </View>
        ))}
        <Footer m={m} />
      </Page>
    </Document>
  );
}
