import { calculateAge } from "@/lib/categories";

/**
 * Parental-consent gate (AVG/GDPR). Dutch law requires parental consent to process
 * a child's data below 16, so the public portal and any outbound email are blocked
 * for under-16 athletes until consent is recorded. Consent is set only when a parent
 * submits the public consent link (consent-actions.ts) — the coach can request it,
 * never set it. Pure + structurally typed so it unit-tests without a db row.
 */
export type ConsentAthlete = {
  dateOfBirth: string;
  contactEmail: string | null;
  parentalConsentAt: Date | null;
};

/** Dutch AVG digital-consent age: under 16 needs a parent's consent. */
export const CONSENT_AGE = 16;

/** How long a consent self-certification link stays valid. */
export const CONSENT_LINK_DAYS = 7;

/** Official Autoriteit Persoonsgegevens page on children's data (linked on the consent page). */
export const AVG_AP_URL =
  "https://www.autoriteitpersoonsgegevens.nl/themas/kinderen";

/** Club privacy policy (official Lu Gia Jen page). Set to "#" to hide the link. */
export const PRIVACY_POLICY_URL: string = "https://lugiajen.nl/privacy-policy/";

/**
 * Is the athlete's consent link currently usable? True only while an unexpired
 * token exists and consent hasn't already been recorded (the link is one-shot).
 */
export function isConsentLinkValid(
  athlete: {
    consentToken: string | null;
    consentTokenExpiresAt: Date | null;
    parentalConsentAt: Date | null;
  },
  now: Date = new Date(),
): boolean {
  return (
    athlete.consentToken != null &&
    athlete.consentTokenExpiresAt != null &&
    athlete.consentTokenExpiresAt > now &&
    athlete.parentalConsentAt == null
  );
}

/** Does this athlete need recorded parental consent? (age < 16) */
export function needsParentalConsent(
  athlete: Pick<ConsentAthlete, "dateOfBirth">,
  reference?: Date,
): boolean {
  return calculateAge(new Date(athlete.dateOfBirth), reference) < CONSENT_AGE;
}

/** Has parental consent been recorded? */
export function hasConsent(
  athlete: Pick<ConsentAthlete, "parentalConsentAt">,
): boolean {
  return athlete.parentalConsentAt != null;
}

/**
 * Block the public portal (and PDF) when a minor has no recorded consent. 16+ is
 * never blocked; an under-16 with consent is open.
 */
export function isPortalBlocked(
  athlete: Pick<ConsentAthlete, "dateOfBirth" | "parentalConsentAt">,
  reference?: Date,
): boolean {
  return needsParentalConsent(athlete, reference) && !hasConsent(athlete);
}

export type Recipient =
  | { ok: true; email: string }
  | { ok: false; reason: "consent" | "no-email" };

/**
 * Where (if anywhere) we may send an athlete's links. Consent is checked first so a
 * minor without consent is never emailed even when a contact address exists.
 */
export function resolveRecipient(
  athlete: Pick<
    ConsentAthlete,
    "dateOfBirth" | "parentalConsentAt" | "contactEmail"
  >,
  reference?: Date,
): Recipient {
  if (isPortalBlocked(athlete, reference)) return { ok: false, reason: "consent" };
  const email = athlete.contactEmail?.trim();
  if (!email) return { ok: false, reason: "no-email" };
  return { ok: true, email };
}
