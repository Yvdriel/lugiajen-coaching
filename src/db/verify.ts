import "dotenv/config";
import { eq } from "drizzle-orm";
import { db, pool } from "../lib/db.serverless";
import { athletes, kata, user } from "./schema";

/**
 * Post-seed read-back (Ch2 "Done when" query test). Asserts coach + all 23 kata
 * + at least one sample athlete are present. Exits non-zero on mismatch.
 */
async function main() {
  const kataRows = await db.select().from(kata);
  const coachRows = await db
    .select()
    .from(user)
    .where(eq(user.email, "coach@lugiajen.nl"));
  const athleteRows = await db.select().from(athletes);
  await pool.end();

  const errors: string[] = [];
  if (kataRows.length !== 23)
    errors.push(`expected 23 kata, got ${kataRows.length}`);
  if (coachRows.length !== 1)
    errors.push(`expected 1 coach, got ${coachRows.length}`);
  if (athleteRows.length < 1)
    errors.push(`expected >=1 athlete, got ${athleteRows.length}`);

  if (errors.length > 0) {
    console.error("VERIFY FAILED:\n  - " + errors.join("\n  - "));
    process.exit(1);
  }
  console.log(
    `VERIFY OK: ${kataRows.length} kata, coach present, ${athleteRows.length} athlete(s).`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
