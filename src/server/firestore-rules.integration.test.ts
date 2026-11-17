import { beforeEach, describe, it } from "vitest";
import assert from "node:assert/strict";
import { getDb } from "./firestore.server";
import { COLLECTIONS } from "./schema.server";
import { clearEmulator, documentUrl } from "./testing/emulator";

// Requests without admin credentials are judged by firestore.rules, exactly like a
// browser using the Firebase client SDK. The server's Admin SDK bypasses the rules.
const PATHS = [
  `${COLLECTIONS.rooms}/seminar-201`,
  `${COLLECTIONS.reservations}/REQ-1042`,
  `${COLLECTIONS.reservations}/REQ-1042/${COLLECTIONS.history}/0`,
  "users/someone",
  "sessions/abc",
];

describe("firestore.rules", () => {
  beforeEach(async () => {
    await clearEmulator();
    for (const path of PATHS) await getDb().doc(path).set({ secret: true });
  });

  for (const path of PATHS) {
    it(`denies a browser reading ${path}`, async () => {
      const response = await fetch(documentUrl(path));
      assert.equal(response.status, 403);
    });

    it(`denies a browser writing ${path}`, async () => {
      const response = await fetch(documentUrl(path), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields: { secret: { booleanValue: false } } }),
      });
      assert.equal(response.status, 403);
      assert.deepEqual((await getDb().doc(path).get()).data(), { secret: true });
    });
  }

  it("denies a browser listing a collection", async () => {
    const response = await fetch(documentUrl(COLLECTIONS.reservations));
    assert.equal(response.status, 403);
  });

  it("still lets the server read through the Admin SDK", async () => {
    const snapshot = await getDb().doc(PATHS[1]).get();
    assert.equal(snapshot.exists, true);
  });
});
