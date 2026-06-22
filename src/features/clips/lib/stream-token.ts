// Pure, env-free RS256 playback-token signer. Kept separate from stream.ts
// (which reads env at import time) so it can be unit-tested without a fully
// configured environment.
import { createPrivateKey } from "node:crypto";
import { importPKCS8, SignJWT } from "jose";

export const DEFAULT_TOKEN_EXP_SECONDS = 3600;

/**
 * Mint a self-signed RS256 Cloudflare Stream playback token locally (no /token
 * API call). `now` is injectable (seconds since epoch) for deterministic tests.
 *
 * Cloudflare returns the signing key as a PKCS#1 PEM
 * (`-----BEGIN RSA PRIVATE KEY-----`), but jose only imports PKCS#8. We
 * normalize any RSA PEM (PKCS#1 or PKCS#8) to PKCS#8 via node:crypto first.
 */
export async function createPlaybackToken(params: {
  uid: string;
  keyId: string;
  privateKeyPemBase64: string;
  expSeconds?: number;
  now?: number;
}): Promise<string> {
  const { uid, keyId, privateKeyPemBase64 } = params;
  const expSeconds = params.expSeconds ?? DEFAULT_TOKEN_EXP_SECONDS;
  const now = params.now ?? Math.floor(Date.now() / 1000);
  const rawPem = Buffer.from(privateKeyPemBase64, "base64").toString("utf8");
  const pkcs8 = createPrivateKey(rawPem).export({
    type: "pkcs8",
    format: "pem",
  }) as string;
  const key = await importPKCS8(pkcs8, "RS256");
  return new SignJWT({ kid: keyId })
    .setProtectedHeader({ alg: "RS256", kid: keyId })
    .setSubject(uid)
    .setIssuedAt(now)
    .setExpirationTime(now + expSeconds)
    .sign(key);
}
