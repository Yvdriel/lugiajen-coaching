import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { APIError } from "better-auth/api";
import { db } from "./db.serverless";
import { env } from "./env";
import * as authSchema from "../db/auth-schema";

/**
 * Better Auth (email/password for coach accounts). Bound to the SERVERLESS
 * client (convention 1) — signUpEmail runs in a transaction.
 *
 * No public registration: the create-before hook blocks every signup unless
 * SEED=1 (the seed script). Ch3 builds the route handler + login UI on top.
 *
 * Auth tables (user/session/account/verification) are owned by drizzle-kit:
 * regenerate with `pnpm exec better-auth generate` + diff on BA upgrade.
 */
export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: authSchema,
  }),
  emailAndPassword: { enabled: true },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          if (process.env.SEED !== "1") {
            throw new APIError("BAD_REQUEST", {
              message: "Registratie is uitgeschakeld.",
            });
          }
          return { data: user };
        },
      },
    },
  },
  // nextCookies MUST be the last plugin.
  plugins: [nextCookies()],
});
