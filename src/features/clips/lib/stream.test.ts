// @vitest-environment node
// jose's WebCrypto signing relies on `instanceof Uint8Array`, which fails under
// the default jsdom env (cross-realm typed arrays). This is a pure crypto test
// with no DOM, so run it in the node environment.
import {
  decodeJwt,
  decodeProtectedHeader,
  exportPKCS8,
  generateKeyPair,
  jwtVerify,
} from "jose";
import { describe, expect, it } from "vitest";
import { createPlaybackToken } from "./stream-token";

// Generate a throwaway RS256 keypair and return the private key as a
// base64-encoded PKCS#8 PEM — the same shape the env signing key uses.
async function dummyKey() {
  const { publicKey, privateKey } = await generateKeyPair("RS256", {
    extractable: true,
  });
  const pem = await exportPKCS8(privateKey);
  return { publicKey, pemBase64: Buffer.from(pem, "utf8").toString("base64") };
}

describe("createPlaybackToken", () => {
  it("mints a verifiable RS256 token with the expected claims and expiry", async () => {
    const { publicKey, pemBase64 } = await dummyKey();
    const now = 1_700_000_000;
    const token = await createPlaybackToken({
      uid: "video-uid-123",
      keyId: "test-key",
      privateKeyPemBase64: pemBase64,
      expSeconds: 3600,
      now,
    });

    // Structurally a JWT.
    expect(token.split(".")).toHaveLength(3);

    // Header: RS256 + the key id.
    const header = decodeProtectedHeader(token);
    expect(header.alg).toBe("RS256");
    expect(header.kid).toBe("test-key");

    // Payload: subject is the video uid, exp is now + expSeconds, kid present.
    const payload = decodeJwt(token);
    expect(payload.sub).toBe("video-uid-123");
    expect(payload.exp).toBe(now + 3600);
    expect(payload.kid).toBe("test-key");

    // Cryptographically valid against the matching public key (verify at the
    // token's own epoch so the fixed `now` isn't treated as expired).
    const verified = await jwtVerify(token, publicKey, {
      currentDate: new Date((now + 1) * 1000),
    });
    expect(verified.payload.sub).toBe("video-uid-123");
  });

  it("defaults the expiry to one hour when expSeconds is omitted", async () => {
    const { pemBase64 } = await dummyKey();
    const now = 1_700_000_000;
    const token = await createPlaybackToken({
      uid: "uid",
      keyId: "k",
      privateKeyPemBase64: pemBase64,
      now,
    });
    expect(decodeJwt(token).exp).toBe(now + 3600);
  });

  it("accepts a PKCS#1 RSA PEM (the format Cloudflare's signing key uses)", async () => {
    // Cloudflare returns `-----BEGIN RSA PRIVATE KEY-----` (PKCS#1), not PKCS#8.
    const { generateKeyPairSync } = await import("node:crypto");
    const { publicKey, privateKey } = generateKeyPairSync("rsa", {
      modulusLength: 2048,
      publicKeyEncoding: { type: "spki", format: "pem" },
      privateKeyEncoding: { type: "pkcs1", format: "pem" },
    });
    expect(privateKey).toContain("BEGIN RSA PRIVATE KEY");
    const pemBase64 = Buffer.from(privateKey, "utf8").toString("base64");

    const now = 1_700_000_000;
    const token = await createPlaybackToken({
      uid: "pkcs1-uid",
      keyId: "cf-key",
      privateKeyPemBase64: pemBase64,
      expSeconds: 3600,
      now,
    });
    expect(decodeJwt(token).sub).toBe("pkcs1-uid");

    const { importSPKI } = await import("jose");
    const pub = await importSPKI(publicKey, "RS256");
    const verified = await jwtVerify(token, pub, {
      currentDate: new Date((now + 1) * 1000),
    });
    expect(verified.payload.sub).toBe("pkcs1-uid");
  });

  it("rejects a tampered token", async () => {
    const { publicKey, pemBase64 } = await dummyKey();
    const now = 1_700_000_000;
    const token = await createPlaybackToken({
      uid: "uid",
      keyId: "k",
      privateKeyPemBase64: pemBase64,
      expSeconds: 600,
      now,
    });
    const [h, p] = token.split(".");
    const tampered = `${h}.${p}.AAAA`;
    await expect(
      jwtVerify(tampered, publicKey, {
        currentDate: new Date((now + 1) * 1000),
      }),
    ).rejects.toThrow();
  });
});
