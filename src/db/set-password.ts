import "dotenv/config";
import { and, eq } from "drizzle-orm";
import { auth } from "../lib/auth";
import { db, pool } from "../lib/db.serverless";
import { account, user } from "./schema";

/**
 * Reset a coach's password from the CLI (the app has no self-service reset; it's a
 * single-coach tool). Hashes with Better Auth's own hasher so prod login verifies it.
 * The hash is salt-based and independent of BETTER_AUTH_SECRET, so a placeholder
 * secret is fine for the env validation.
 *
 *   COACH_EMAIL=coach@lugiajen.nl NEW_PASSWORD='…' \
 *   DATABASE_URL='<prod pooled>' DATABASE_URL_UNPOOLED='<same>' \
 *   BETTER_AUTH_SECRET=x BETTER_AUTH_URL=https://app NEON_LOCAL=false \
 *   pnpm exec tsx src/db/set-password.ts
 */
async function main() {
  const email = process.env.COACH_EMAIL ?? "coach@lugiajen.nl";
  const newPassword = process.env.NEW_PASSWORD;
  if (!newPassword || newPassword.length < 8) {
    throw new Error("NEW_PASSWORD is required (min 8 chars).");
  }

  const [u] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, email));
  if (!u) throw new Error(`No user with email ${email}.`);

  const ctx = await auth.$context;
  const hash = await ctx.password.hash(newPassword);

  const updated = await db
    .update(account)
    .set({ password: hash, updatedAt: new Date() })
    .where(and(eq(account.userId, u.id), eq(account.providerId, "credential")))
    .returning({ id: account.id });
  if (updated.length === 0) {
    throw new Error(`No credential account for ${email}.`);
  }

  console.log(`[set-password] updated password for ${email}.`);
  await pool.end();
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[set-password] failed:", err);
    process.exit(1);
  });
