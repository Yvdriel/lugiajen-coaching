import { Resend } from "resend";
import { env } from "@/lib/env";

/**
 * Resend client — null when RESEND_API_KEY is unset (local dev / tests / CI), so the
 * send helpers degrade to a no-op instead of crashing at import time.
 */
export const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

/** Verified sender. Falls back to Resend's shared test domain when unconfigured. */
export const EMAIL_FROM = env.EMAIL_FROM ?? "Lu Gia Jen <onboarding@resend.dev>";
