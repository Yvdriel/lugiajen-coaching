import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import { env, isNeonLocal } from "./env";

/**
 * Serverless (WebSocket Pool) DB client (convention 1): the ONLY client doing
 * real interactive `db.transaction(...)`. Used by seed scripts and bound to the
 * Better Auth adapter (its signUpEmail runs in a transaction).
 */
neonConfig.webSocketConstructor = ws;

if (isNeonLocal) {
  // Route WS at the local Neon proxy /v2 endpoint (docker-compose `neon-proxy`),
  // regardless of the connection-string host.
  neonConfig.useSecureWebSocket = false;
  neonConfig.poolQueryViaFetch = true;
  neonConfig.fetchEndpoint = "http://localhost:4444/sql";
  neonConfig.wsProxy = () => "localhost:4444/v2";
}

export const pool = new Pool({ connectionString: env.DATABASE_URL });

export const db = drizzle({ client: pool });
