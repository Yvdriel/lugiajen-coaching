import "dotenv/config";

/**
 * Seed script stub. Real seed lands in Ch2:
 *   - all ~23 Shotokan kata (names / split flags / flex / sort_order)
 *   - demo coach via auth.api.signUpEmail under the serverless client (SEED=1)
 *   - one sample athlete + athlete_kata / scoring cards / feedback / competition
 *
 * Runs under the serverless client (db.serverless.ts) so it can use real
 * transactions.
 */
async function main() {
  console.log("[seed] stub — implemented in Ch2. Nothing to seed yet.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
