import { randomUUID } from "node:crypto";
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { getDb } from "./firestore.server";

describe("getDb against the Firestore emulator", () => {
  it("is connected to the emulator, not a real project", () => {
    assert.match(process.env.FIRESTORE_EMULATOR_HOST ?? "", /^127\.0\.0\.1:\d+$/);
  });

  it("writes, reads and deletes a document", async () => {
    const ref = getDb().collection("_smoke").doc(randomUUID());
    await ref.set({ message: "hello", count: 1 });

    const snapshot = await ref.get();
    assert.deepEqual(snapshot.data(), { message: "hello", count: 1 });

    await ref.delete();
    assert.equal((await ref.get()).exists, false);
  });

  it("reuses one database instance per process", () => {
    assert.equal(getDb(), getDb());
  });
});
