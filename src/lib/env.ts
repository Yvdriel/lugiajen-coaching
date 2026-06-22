import { z } from "zod";

/**
 * Validated, typed environment. Imported by server runtime + scripts only
 * (never client components — it reads process.env). Fails fast with a readable
 * message if anything required is missing.
 */
const EnvSchema = z.object({
  // Pooled connection — runtime app via neon-http / neon-serverless.
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  // Direct/unpooled connection — drizzle-kit migrate/generate DDL.
  DATABASE_URL_UNPOOLED: z.string().min(1, "DATABASE_URL_UNPOOLED is required"),
  // Better Auth (used from Ch3; validated now so config is complete).
  BETTER_AUTH_SECRET: z.string().min(1, "BETTER_AUTH_SECRET is required"),
  BETTER_AUTH_URL: z.string().min(1, "BETTER_AUTH_URL is required"),
  // When "true", point the neon drivers at the local docker proxy (see db.ts).
  NEON_LOCAL: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
  // Email (Resend). Optional so local dev / tests / CI run without them; the send
  // helpers no-op when RESEND_API_KEY is absent (lib/email/send.ts).
  RESEND_API_KEY: z.string().min(1).optional(),
  EMAIL_FROM: z.string().min(1).optional(), // e.g. "Lu Gia Jen <noreply@…>"
  // Shared secret guarding the cron route (Authorization: Bearer …).
  CRON_SECRET: z.string().min(1).optional(),
  // Cloudflare Stream (video). Optional so the app/tests boot without them; the
  // Stream client (features/clips/lib/stream.ts) asserts the ones it needs at
  // call time. API token scope: Stream:Edit. SIGNING_KEY_PEM is base64-encoded
  // (decode before signing). WEBHOOK_SECRET is consumed by the Session 2 webhook.
  CLOUDFLARE_ACCOUNT_ID: z.string().min(1).optional(),
  CLOUDFLARE_STREAM_API_TOKEN: z.string().min(1).optional(),
  CLOUDFLARE_STREAM_CUSTOMER_SUBDOMAIN: z.string().min(1).optional(),
  CLOUDFLARE_STREAM_SIGNING_KEY_ID: z.string().min(1).optional(),
  CLOUDFLARE_STREAM_SIGNING_KEY_PEM: z.string().min(1).optional(),
  CLOUDFLARE_STREAM_WEBHOOK_SECRET: z.string().min(1).optional(),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
    .join("\n");
  throw new Error(`Invalid environment variables:\n${issues}`);
}

export const env = parsed.data;
export const isNeonLocal = env.NEON_LOCAL;
