import { describe, expect, it } from "vitest";
import { createInMemoryRateLimiter } from "./rate-limit";

describe("createInMemoryRateLimiter", () => {
  it("allows up to the limit, then blocks", () => {
    const rl = createInMemoryRateLimiter({
      limit: 3,
      windowMs: 1000,
      now: () => 0,
    });
    expect(rl.check("a").ok).toBe(true); // 1
    expect(rl.check("a").ok).toBe(true); // 2
    const third = rl.check("a"); // 3 — last allowed
    expect(third.ok).toBe(true);
    expect(third.remaining).toBe(0);
    expect(rl.check("a").ok).toBe(false); // 4 — over the limit
  });

  it("tracks keys independently (IP+token isolation)", () => {
    const rl = createInMemoryRateLimiter({
      limit: 1,
      windowMs: 1000,
      now: () => 0,
    });
    expect(rl.check("a").ok).toBe(true);
    expect(rl.check("a").ok).toBe(false);
    expect(rl.check("b").ok).toBe(true); // different key is unaffected
  });

  it("resets once the window elapses", () => {
    let t = 0;
    const rl = createInMemoryRateLimiter({
      limit: 1,
      windowMs: 1000,
      now: () => t,
    });
    expect(rl.check("a").ok).toBe(true);
    expect(rl.check("a").ok).toBe(false);
    t = 1000; // window boundary reached
    expect(rl.check("a").ok).toBe(true);
  });
});
