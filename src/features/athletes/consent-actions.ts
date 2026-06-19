"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { athletes } from "@/db/schema";
import { db } from "@/lib/db";
import { getAthleteByConsentToken } from "@/lib/queries/athletes";
import { consentRateLimiter } from "@/lib/rate-limit";
import { nl } from "@/messages/nl";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ConsentFormState = {
  ok: boolean;
  fieldErrors?: Record<string, string>;
  message?: string;
};

const fullNameSchema = z.string().trim().min(2, "Vul je volledige naam in.");

/**
 * PUBLIC (no session): the parent self-certifies consent. Bound to the token by the
 * page (`submitConsent.bind(null, token)`), so the token is server-controlled. Only
 * an unexpired, not-yet-consented token is accepted. The token is deliberately kept
 * after recording consent (so the post-action page re-render lands on the thank-you,
 * not "link invalid"); one-shot is enforced by the `parentalConsentAt IS NULL` write
 * guard below. Recording consent here is the ONLY way consent is ever set.
 */
export async function submitConsent(
  token: string,
  _prev: ConsentFormState,
  formData: FormData,
): Promise<ConsentFormState> {
  const c = nl.consent.page;
  if (!UUID_RE.test(token)) return { ok: false, message: c.invalid };

  const hdrs = await headers();
  const ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!consentRateLimiter.check(`${ip}:${token}`).ok) {
    return { ok: false, message: nl.portal.rateLimited };
  }

  const athlete = await getAthleteByConsentToken(token);
  if (!athlete) return { ok: false, message: c.invalid };
  if (athlete.parentalConsentAt) return { ok: false, message: c.alreadyGiven };
  if (
    !athlete.consentTokenExpiresAt ||
    athlete.consentTokenExpiresAt < new Date()
  ) {
    return { ok: false, message: c.expired };
  }

  const parsed = fullNameSchema.safeParse(formData.get("fullName"));
  if (!parsed.success) {
    return { ok: false, fieldErrors: { fullName: parsed.error.issues[0].message } };
  }

  // Record consent. The token is intentionally NOT cleared: after a server action
  // Next re-renders this page's server component, and a nulled token would resolve
  // to the "invalid" branch instead of the thank-you. One-shot is enforced by the
  // `parentalConsentAt IS NULL` guard below (a second submit is a no-op) and by the
  // page short-circuiting to the success card once consent exists.
  const updated = await db
    .update(athletes)
    .set({
      parentalConsentAt: new Date(),
      parentalConsentName: parsed.data,
    })
    .where(
      and(
        eq(athletes.id, athlete.id),
        eq(athletes.consentToken, token),
        isNull(athletes.parentalConsentAt),
      ),
    )
    .returning({ id: athletes.id });
  if (updated.length === 0) return { ok: false, message: c.alreadyGiven };

  revalidatePath(`/athletes/${athlete.id}`);
  revalidatePath(`/athlete/view/${athlete.viewToken}`);
  return { ok: true };
}
