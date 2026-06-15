import { neon, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { env, isNeonLocal } from "./env";

/**
 * Primary DB client (convention 1): neon-http over the pooled DATABASE_URL.
 * The 95% single-statement path. Atomic multi-row writes use `db.batch([...])`
 * — NOT interactive transactions (use db.serverless.ts for those).
 */
if (isNeonLocal) {
  // Route the HTTP driver at the local Neon proxy (docker-compose `neon-proxy`).
  neonConfig.fetchEndpoint = "http://localhost:4444/sql";
  neonConfig.useSecureWebSocket = false;
  neonConfig.poolQueryViaFetch = true;
}

const sql = neon(env.DATABASE_URL);

export const db = drizzle(sql);
