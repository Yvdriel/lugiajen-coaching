import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { ReactNode } from "react";
import { nl } from "@/messages/nl";

// Monochrome brand palette (CLAUDE.md). Inline styles only — the most portable
// path across email clients, no Tailwind build step.
const palette = {
  black: "#000000",
  nearBlack: "#1a1a1a",
  midGray: "#777777",
  ruleGray: "#cccccc",
  fieldBg: "#f5f5f5",
  white: "#ffffff",
};

const main = { backgroundColor: palette.fieldBg, margin: 0, padding: "24px 0" };
const container = {
  backgroundColor: palette.white,
  border: `1px solid ${palette.ruleGray}`,
  borderRadius: "8px",
  margin: "0 auto",
  maxWidth: "520px",
  padding: "32px",
};
const brand = {
  color: palette.black,
  fontSize: "13px",
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase" as const,
  margin: 0,
};
const hr = { borderColor: palette.ruleGray, margin: "24px 0" };
const footer = { color: palette.midGray, fontSize: "12px", margin: 0 };

const fontFamily =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, Helvetica, Arial, sans-serif';

export function BrandLayout({
  preview,
  children,
}: {
  preview: string;
  children: ReactNode;
}) {
  return (
    <Html lang="nl">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ ...main, fontFamily, color: palette.nearBlack }}>
        <Container style={container}>
          <Text style={brand}>{nl.app.name}</Text>
          <Hr style={hr} />
          {children}
          <Hr style={hr} />
          <Section>
            <Text style={footer}>{nl.email.brandFooter}</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// Shared text/link/button styles reused by the concrete templates.
export const emailStyles = {
  fontFamily,
  heading: {
    color: palette.black,
    fontSize: "20px",
    fontWeight: 600,
    margin: "0 0 16px",
  },
  text: {
    color: palette.nearBlack,
    fontSize: "15px",
    lineHeight: "24px",
    margin: "0 0 16px",
  },
  meta: { color: palette.midGray, fontSize: "13px", margin: "0 0 16px" },
  button: {
    backgroundColor: palette.black,
    borderRadius: "6px",
    color: palette.white,
    display: "inline-block",
    fontSize: "15px",
    fontWeight: 600,
    padding: "12px 20px",
    textDecoration: "none",
  },
  fallback: { color: palette.midGray, fontSize: "12px", margin: "16px 0 4px" },
  link: { color: palette.nearBlack, fontSize: "12px", wordBreak: "break-all" as const },
};
