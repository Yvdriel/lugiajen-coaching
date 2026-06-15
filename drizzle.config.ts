import "dotenv/config";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { defineConfig } from "drizzle-kit";

// drizzle-kit auto-selects the @neondatabase/serverless (WebSocket) driver for
// the postgresql dialect. Against Neon CLOUD that connects natively over WS.
// LOCALLY we route it through the docker Neon proxy (/v2 WS on :4444), same as
// the runtime serverless client. Gated on NEON_LOCAL so prod is untouched.
if (process.env.NEON_LOCAL === "true") {
  neonConfig.webSocketConstructor = ws;
  neonConfig.useSecureWebSocket = false;
  neonConfig.poolQueryViaFetch = true;
  neonConfig.fetchEndpoint = "http://localhost:4444/sql";
  neonConfig.wsProxy = () => "localhost:4444/v2";
}

const url = process.env.DATABASE_URL_UNPOOLED;
if (!url) {
  throw new Error("DATABASE_URL_UNPOOLED is required for drizzle-kit");
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url },
  strict: true,
  verbose: true,
});
