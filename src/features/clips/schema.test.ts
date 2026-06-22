import { describe, expect, it } from "vitest";
import { clipUploadSchema } from "./schema";

const UID = "11111111-1111-1111-1111-111111111111";

describe("clipUploadSchema", () => {
  it("accepts a valid athleteId with optional fields omitted", () => {
    expect(clipUploadSchema.safeParse({ athleteId: UID }).success).toBe(true);
  });

  it("accepts optional kata / label / recordedAt", () => {
    const r = clipUploadSchema.safeParse({
      athleteId: UID,
      kataId: UID,
      label: "training 12 juni",
      recordedAt: "2026-06-22",
    });
    expect(r.success).toBe(true);
  });

  it("normalizes empty strings to undefined", () => {
    const r = clipUploadSchema.safeParse({
      athleteId: UID,
      kataId: "",
      label: "",
      recordedAt: "",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.kataId).toBeUndefined();
      expect(r.data.label).toBeUndefined();
      expect(r.data.recordedAt).toBeUndefined();
    }
  });

  it("rejects a missing or invalid athleteId", () => {
    expect(clipUploadSchema.safeParse({}).success).toBe(false);
    expect(clipUploadSchema.safeParse({ athleteId: "nope" }).success).toBe(
      false,
    );
  });

  it("rejects a bad recordedAt format", () => {
    expect(
      clipUploadSchema.safeParse({ athleteId: UID, recordedAt: "22-06-2026" })
        .success,
    ).toBe(false);
  });
});
