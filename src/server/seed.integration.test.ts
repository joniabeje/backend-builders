import { beforeEach, describe, it } from "vitest";
import assert from "node:assert/strict";
import { computeRisk } from "@/domain/risk";
import { MOCK_REQUESTS } from "@/lib/mock-requests";
import { ROOMS } from "@/lib/rooms";
import { getDb } from "./firestore.server";
import {
  COLLECTIONS,
  fromReservationDoc,
  type HistoryDoc,
  type ReservationDoc,
} from "./schema.server";
import { seedDatabase } from "./seed.server";
import { clearEmulator } from "./testing/emulator";

async function readAll() {
  const db = getDb();
  const rooms = await db.collection(COLLECTIONS.rooms).get();
  const reservations = await db.collection(COLLECTIONS.reservations).get();
  const history = await db.collectionGroup(COLLECTIONS.history).get();
  return { rooms, reservations, history };
}

describe("seedDatabase", () => {
  beforeEach(clearEmulator);

  it("loads every CEA room into a fresh database", async () => {
    await seedDatabase(getDb());
    const { rooms } = await readAll();
    assert.deepEqual(rooms.docs.map((doc) => doc.id).sort(), ROOMS.map((room) => room.id).sort());
    const seminar = rooms.docs.find((doc) => doc.id === "seminar-201")?.data();
    assert.equal(seminar?.capacity, 25);
    assert.deepEqual(seminar?.features, ["Smart Board", "Video Conferencing", "Whiteboard"]);
  });

  it("loads the demo reservations with server-computed risk and their history", async () => {
    const counts = await seedDatabase(getDb());
    const { reservations, history } = await readAll();
    assert.equal(reservations.size, MOCK_REQUESTS.length);
    assert.equal(history.size, counts.historyEntries);
    assert.ok(counts.historyEntries > 0);

    for (const mock of MOCK_REQUESTS) {
      const ref = getDb().collection(COLLECTIONS.reservations).doc(mock.id);
      const doc = (await ref.get()).data() as ReservationDoc;
      const entries = (await ref.collection(COLLECTIONS.history).get()).docs.map(
        (entry) => entry.data() as HistoryDoc,
      );
      const stored = fromReservationDoc(mock.id, doc, entries);
      assert.deepEqual(stored.risk, computeRisk(mock), mock.id);
      assert.equal(stored.history.length, mock.history.length, mock.id);
      assert.equal(doc.requesterId, null);
    }
  });

  it("can run twice without duplicating anything", async () => {
    const first = await seedDatabase(getDb());
    await seedDatabase(getDb());
    const { rooms, reservations, history } = await readAll();
    assert.equal(rooms.size, first.rooms);
    assert.equal(reservations.size, first.reservations);
    assert.equal(history.size, first.historyEntries);
  });

  it("seeds rooms only when given no reservations", async () => {
    await seedDatabase(getDb(), { reservations: [] });
    const { rooms, reservations } = await readAll();
    assert.equal(rooms.size, ROOMS.length);
    assert.equal(reservations.size, 0);
  });
});
