import { Button, Heading, Section, Text } from "@react-email/components";
import { nl } from "@/messages/nl";
import { BrandLayout, emailStyles as s } from "./brand-layout";

export type CoachSubmittedEmailProps = {
  athleteName: string;
  link: string;
  meetingNumber: number;
};

/** Coach notification: an athlete submitted their prepare form. */
export function CoachSubmittedEmail({
  athleteName,
  link,
  meetingNumber,
}: CoachSubmittedEmailProps) {
  const t = nl.email.coachSubmitted;
  return (
    <BrandLayout preview={t.preview}>
      <Heading style={s.heading}>{t.heading}</Heading>
      <Text style={s.text}>
        <strong>{athleteName}</strong> {t.intro}
      </Text>
      <Text style={s.meta}>
        {t.meetingLabel} {meetingNumber}
      </Text>
      <Section style={{ margin: "8px 0 8px" }}>
        <Button href={link} style={s.button}>
          {t.button}
        </Button>
      </Section>
    </BrandLayout>
  );
}

CoachSubmittedEmail.PreviewProps = {
  athleteName: "Mila de Vries",
  link: "http://localhost:3005/athletes/preview/feedback/preview",
  meetingNumber: 1,
} satisfies CoachSubmittedEmailProps;

export default CoachSubmittedEmail;
