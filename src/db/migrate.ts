import "dotenv/config";
import { migrate } from "drizzle-orm/neon-serverless/migrator";
import { db, pool } from "../lib/db.serverless";

/**
 * Apply pending migrations from ./drizzle using the app's serverless client.
 * Works identically local (via the docker Neon proxy) and on Neon cloud — the
 * NEON_LOCAL gating in db.serverless.ts handles the difference. Preferred over
 * `drizzle-kit migrate`, whose driver auto-selection doesn't honor our local
 * neonConfig proxy overrides.
 */
async function main() {
  await migrate(db, { migrationsFolder: "./drizzle" });
  await pool.end();
  console.log("[migrate] done.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[migrate] failed:", err);
    process.exit(1);
  });
