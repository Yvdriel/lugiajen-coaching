import { createAuthClient } from "better-auth/react";

/**
 * Browser auth client. baseURL is inferred from the current origin (the
 * /api/auth handler is same-origin), so this stays free of server-only env —
 * safe to import from client components. Used only for signOut in the nav.
 */
export const authClient = createAuthClient();

export const { signIn, signOut, useSession } = authClient;
