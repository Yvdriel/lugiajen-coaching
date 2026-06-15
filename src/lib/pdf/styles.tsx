import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "@react-pdf/renderer";
import { nl } from "@/messages/nl";

// Shared branded styles + primitives for the Ch11 PDFs. Server-only (this module
// must never be imported by a client component). Monochrome palette mirrors the
// app brand; @react-pdf doesn't read Tailwind, so colours/fonts are raw here.
// Helvetica is built in to @react-pdf — no Font.register, no network at render.

export const colors = {
  black: "#000000",
  nearBlack: "#1a1a1a",
  darkGray: "#333333",
  midGray: "#777777",
  ruleGray: "#cccccc",
  fieldBg: "#f5f5f5",
  white: "#ffffff",
} as const;

export const styles = StyleSheet.create({
  page: {
    backgroundColor: colors.white,
    color: colors.black,
    paddingTop: 40,
    paddingBottom: 48,
    paddingHorizontal: 44,
    fontFamily: "Helvetica",
    fontSize: 10,
    lineHeight: 1.4,
  },
  header: {
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.black,
    paddingBottom: 10,
  },
  brand: { fontFamily: "Helvetica-Bold", fontSize: 16, letterSpacing: 0.5 },
  brandSub: {
    fontSize: 8,
    color: colors.midGray,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: 1,
  },
  docTitle: { fontFamily: "Helvetica-Bold", fontSize: 13, marginTop: 10 },
  docSubtitle: { fontSize: 9, color: colors.midGray, marginTop: 2 },
  section: { marginTop: 14 },
  sectionTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9.5,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: colors.darkGray,
    marginBottom: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.ruleGray,
    paddingBottom: 3,
  },
  field: { marginBottom: 6 },
  fieldLabel: {
    fontSize: 7.5,
    color: colors.midGray,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 1,
  },
  fieldValue: { fontSize: 10, color: colors.black },
  twoCol: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -8 },
  col: { width: "50%", paddingHorizontal: 8 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 2.5,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.fieldBg,
  },
  rowLabel: { fontSize: 9, color: colors.darkGray },
  rowValue: { fontSize: 9, fontFamily: "Helvetica-Bold" },
  muted: { color: colors.midGray },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 44,
    right: 44,
    fontSize: 7.5,
    color: colors.midGray,
    textAlign: "center",
    borderTopWidth: 0.5,
    borderTopColor: colors.ruleGray,
    paddingTop: 6,
  },
});

export function DocHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <View style={styles.header}>
      <Text style={styles.brand}>{nl.app.name}</Text>
      <Text style={styles.brandSub}>{nl.app.tagline}</Text>
      <Text style={styles.docTitle}>{title}</Text>
      {subtitle ? <Text style={styles.docSubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

/** Label-over-value field; renders nothing for empty values (mirrors the app's Row). */
export function Field({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <View style={styles.field} wrap={false}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{String(value)}</Text>
    </View>
  );
}

/** Single-line label/value stat row (right-aligned value). */
export function StatRow({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{String(value)}</Text>
    </View>
  );
}

export function Footer() {
  return (
    <Text style={styles.footer} fixed>
      {nl.app.name} · {nl.app.tagline}
    </Text>
  );
}
