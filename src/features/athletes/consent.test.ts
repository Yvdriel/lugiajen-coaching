import { describe, expect, it } from "vitest";
import {
  isConsentLinkValid,
  isPortalBlocked,
  needsParentalConsent,
  resolveRecipient,
} from "./consent";

// Fixed reference so age math is deterministic.
const REF = new Date("2026-06-19");

// Date of birth that yields exactly `age` whole years at REF (birthday Jan 1).
function dobForAge(age: number): string {
  return `${REF.getFullYear() - age}-01-01`;
}

describe("needsParentalConsent", () => {
  it("is true under 16", () => {
    expect(needsParentalConsent({ dateOfBirth: dobForAge(15) }, REF)).toBe(true);
    expect(needsParentalConsent({ dateOfBirth: dobForAge(9) }, REF)).toBe(true);
  });

  it("is false at 16 and over", () => {
    expect(needsParentalConsent({ dateOfBirth: dobForAge(16) }, REF)).toBe(
      false,
    );
    expect(needsParentalConsent({ dateOfBirth: dobForAge(21) }, REF)).toBe(
      false,
    );
  });
});

describe("isPortalBlocked", () => {
  it("blocks an under-16 without recorded consent", () => {
    expect(
      isPortalBlocked({ dateOfBirth: dobForAge(15), parentalConsentAt: null }, REF),
    ).toBe(true);
  });

  it("opens an under-16 once consent is recorded", () => {
    expect(
      isPortalBlocked(
        { dateOfBirth: dobForAge(15), parentalConsentAt: new Date() },
        REF,
      ),
    ).toBe(false);
  });

  it("never blocks 16+ regardless of consent", () => {
    expect(
      isPortalBlocked({ dateOfBirth: dobForAge(16), parentalConsentAt: null }, REF),
    ).toBe(false);
  });
});

describe("resolveRecipient", () => {
  const email = "ouder@example.com";

  it("refuses a consent-blocked minor even with an email", () => {
    expect(
      resolveRecipient(
        { dateOfBirth: dobForAge(12), parentalConsentAt: null, contactEmail: email },
        REF,
      ),
    ).toEqual({ ok: false, reason: "consent" });
  });

  it("refuses when no contact email is on file", () => {
    expect(
      resolveRecipient(
        { dateOfBirth: dobForAge(18), parentalConsentAt: null, contactEmail: null },
        REF,
      ),
    ).toEqual({ ok: false, reason: "no-email" });
  });

  it("resolves an adult with an email", () => {
    expect(
      resolveRecipient(
        { dateOfBirth: dobForAge(18), parentalConsentAt: null, contactEmail: email },
        REF,
      ),
    ).toEqual({ ok: true, email });
  });

  it("resolves a consented minor with an email", () => {
    expect(
      resolveRecipient(
        {
          dateOfBirth: dobForAge(13),
          parentalConsentAt: new Date(),
          contactEmail: ` ${email} `,
        },
        REF,
      ),
    ).toEqual({ ok: true, email });
  });
});

describe("isConsentLinkValid", () => {
  const future = new Date(REF.getTime() + 24 * 60 * 60 * 1000);
  const past = new Date(REF.getTime() - 24 * 60 * 60 * 1000);

  it("is true for an unexpired token without consent yet", () => {
    expect(
      isConsentLinkValid(
        {
          consentToken: "tok",
          consentTokenExpiresAt: future,
          parentalConsentAt: null,
        },
        REF,
      ),
    ).toBe(true);
  });

  it("is false once the token has expired", () => {
    expect(
      isConsentLinkValid(
        {
          consentToken: "tok",
          consentTokenExpiresAt: past,
          parentalConsentAt: null,
        },
        REF,
      ),
    ).toBe(false);
  });

  it("is false once consent is already recorded", () => {
    expect(
      isConsentLinkValid(
        {
          consentToken: "tok",
          consentTokenExpiresAt: future,
          parentalConsentAt: new Date(),
        },
        REF,
      ),
    ).toBe(false);
  });

  it("is false when there is no token", () => {
    expect(
      isConsentLinkValid(
        {
          consentToken: null,
          consentTokenExpiresAt: null,
          parentalConsentAt: null,
        },
        REF,
      ),
    ).toBe(false);
  });
});
