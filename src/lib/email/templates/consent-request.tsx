import { Button, Heading, Link, Section, Text } from "@react-email/components";
import { nl } from "@/messages/nl";
import { BrandLayout, emailStyles as s } from "./brand-layout";

export type ConsentRequestEmailProps = {
  athleteName: string;
  link: string;
};

/** Parental-consent request (AVG). Always Dutch. */
export function ConsentRequestEmail({
  athleteName,
  link,
}: ConsentRequestEmailProps) {
  const t = nl.consent.email;
  return (
    <BrandLayout preview={t.preview}>
      <Heading style={s.heading}>{t.heading}</Heading>
      <Text style={s.text}>
        {t.intro} <strong>{athleteName}</strong>.
      </Text>
      <Text style={s.text}>{t.body}</Text>
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

ConsentRequestEmail.PreviewProps = {
  athleteName: "Mila de Vries",
  link: "http://localhost:3005/consent/preview-token",
} satisfies ConsentRequestEmailProps;

export default ConsentRequestEmail;
