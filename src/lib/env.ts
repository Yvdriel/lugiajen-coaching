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
