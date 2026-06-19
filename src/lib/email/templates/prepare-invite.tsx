import { Button, Heading, Link, Section, Text } from "@react-email/components";
import { nl } from "@/messages/nl";
import { BrandLayout, emailStyles as s } from "./brand-layout";

export type PrepareInviteEmailProps = {
  athleteName: string;
  link: string;
  meetingNumber: number;
  isReminder: boolean;
};

/** Athlete/parent invite (or reminder) to fill in the prepare form. Always Dutch. */
export function PrepareInviteEmail({
  athleteName,
  link,
  meetingNumber,
  isReminder,
}: PrepareInviteEmailProps) {
  const t = nl.email.prepareInvite;
  return (
    <BrandLayout preview={t.preview}>
      <Heading style={s.heading}>{t.heading}</Heading>
      <Text style={s.text}>
        {athleteName ? `${t.hi} ${athleteName},` : `${t.hi},`}
      </Text>
      <Text style={s.text}>{isReminder ? t.reminderIntro : t.intro}</Text>
      <Text style={s.meta}>
        {t.meetingLabel} {meetingNumber}
      </Text>
      <Section style={{ margin: "8px 0 8px" }}>
        <Button href={link} style={s.button}>
          {t.button}
        </Button>
      </Section>
      <Text style={s.fallback}>{t.fallback}</Text>
      <Link href={link} style={s.link}>
        {link}
      </Link>
    </BrandLayout>
  );
}

PrepareInviteEmail.PreviewProps = {
  athleteName: "Mila",
  link: "http://localhost:3005/feedback/prepare/preview-token",
  meetingNumber: 1,
  isReminder: false,
} satisfies PrepareInviteEmailProps;

export default PrepareInviteEmail;
