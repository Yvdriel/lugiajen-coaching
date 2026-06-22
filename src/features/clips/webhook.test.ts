import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { parseStreamEvent, verifyWebhookSignature } from "./webhook";

const SECRET = "test-secret";
const NOW = 1_700_000_000;
const BODY = JSON.stringify({ uid: "abc", status: { state: "ready" } });

function sign(body: string, time: number, secret = SECRET): string {
  return createHmac("sha256", secret).update(`${time}.${body}`).digest("hex");
}

describe("verifyWebhookSignature", () => {
  it("accepts a valid signature within the window", () => {
    const header = `time=${NOW},sig1=${sign(BODY, NOW)}`;
    expect(verifyWebhookSignature(BODY, header, SECRET, NOW)).toBe(true);
  });

  it("rejects a tampered body", () => {
    const header = `time=${NOW},sig1=${sign(BODY, NOW)}`;
    expect(verifyWebhookSignature(`${BODY} `, header, SECRET, NOW)).toBe(false);
  });

  it("rejects the wrong secret", () => {
    const header = `time=${NOW},sig1=${sign(BODY, NOW, "other")}`;
    expect(verifyWebhookSignature(BODY, header, SECRET, NOW)).toBe(false);
  });

  it("rejects a stale timestamp", () => {
    const old = NOW - 10 * 60;
    const header = `time=${old},sig1=${sign(BODY, old)}`;
    expect(verifyWebhookSignature(BODY, header, SECRET, NOW)).toBe(false);
  });

  it("rejects a missing or malformed header", () => {
    expect(verifyWebhookSignature(BODY, null, SECRET, NOW)).toBe(false);
    expect(verifyWebhookSignature(BODY, "garbage", SECRET, NOW)).toBe(false);
  });

  it("rejects when no secret is configured", () => {
    const header = `time=${NOW},sig1=${sign(BODY, NOW)}`;
    expect(verifyWebhookSignature(BODY, header, undefined, NOW)).toBe(false);
  });
});

describe("parseStreamEvent", () => {
  it("extracts the fields we persist", () => {
    const body = JSON.stringify({
      uid: "vid123",
      readyToStream: true,
      status: { state: "ready" },
      duration: 5.5,
      thumbnail: "https://x/thumb.jpg",
      meta: { clipid: "clip-1" },
    });
    const ev = parseStreamEvent(body);
    expect(ev).not.toBeNull();
    expect(ev?.uid).toBe("vid123");
    expect(ev?.state).toBe("ready");
    expect(ev?.readyToStream).toBe(true);
    expect(ev?.durationSeconds).toBe(5.5);
    expect(ev?.thumbnail).toBe("https://x/thumb.jpg");
    expect(ev?.meta.clipid).toBe("clip-1");
  });

  it("returns null on non-JSON or a missing uid", () => {
    expect(parseStreamEvent("not json")).toBeNull();
    expect(parseStreamEvent(JSON.stringify({ status: {} }))).toBeNull();
  });
});
