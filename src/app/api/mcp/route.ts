import type { AuthInfo } from "@modelcontextprotocol/server";
import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { registerTrainingTools } from "@/features/training/mcp";
import { registerCoachingTools } from "@/features/training/mcp-coaching";
import { env } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * MCP endpoint for Claude Code (ADR 0001). Stateless: mcp-handler builds a fresh
 * server per request. Single coach, single static token; fails closed when
 * MCP_TOKEN is unset, same shape as the cron route.
 */
const handler = createMcpHandler(
  (server) => {
    registerTrainingTools(server);
    registerCoachingTools(server);
  },
  {
    serverInfo: { name: "lugiajen-coaching", version: "1.0.0" },
  },
);

const verifyToken = async (
  _req: Request,
  bearer?: string,
): Promise<AuthInfo | undefined> => {
  if (!env.MCP_TOKEN || !bearer || bearer !== env.MCP_TOKEN) return undefined;
  return { token: bearer, scopes: ["coach"], clientId: "claude-code" };
};

const authed = withMcpAuth(handler, verifyToken, {
  required: true,
  requiredScopes: ["coach"],
});

export { authed as GET, authed as POST };
