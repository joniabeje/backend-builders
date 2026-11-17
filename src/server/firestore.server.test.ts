import { afterEach, beforeEach, describe, it, vi } from "vitest";
import assert from "node:assert/strict";

describe("getDb configuration", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("FIRESTORE_EMULATOR_HOST", "");
    vi.stubEnv("FIREBASE_PROJECT_ID", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("refuses to start without the emulator or a project id", async () => {
    const { getDb } = await import("./firestore.server");
    assert.throws(() => getDb(), /Firestore is not configured/);
  }, 15_000);
});
