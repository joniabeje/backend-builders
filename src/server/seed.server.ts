// Seed data for a fresh database (#58): the normalized CEA room catalog (TD-06) and the
// demo reservations with their history. Run with `npm run seed`.
import type { Firestore } from "firebase-admin/firestore";
import type { UnscoredEventRequest } from "@/domain/reservation";
import { withRisk } from "@/domain/risk";
import { MOCK_REQUESTS } from "@/lib/mock-requests";
import { ROOMS, type Room } from "@/lib/rooms";
import { COLLECTIONS, toReservationDoc, toRoomDoc } from "./schema.server";

export type SeedCounts = { rooms: number; reservations: number; historyEntries: number };

export type SeedOptions = {
  rooms?: readonly Room[];
  /** Demo requests. Pass [] to seed rooms only, e.g. into a real project. */
  reservations?: readonly UnscoredEventRequest[];
};

/**
 * Writes the rooms and reservations in one batch. Every document has a fixed id, so
 * running it again overwrites the same documents instead of adding duplicates. Risk is
 * computed here, as the API does on submit, so seeded and submitted requests match.
 */
export async function seedDatabase(
  db: Firestore,
  { rooms = ROOMS, reservations = MOCK_REQUESTS }: SeedOptions = {},
): Promise<SeedCounts> {
  const batch = db.batch();
  let historyEntries = 0;

  for (const room of rooms) {
    batch.set(db.collection(COLLECTIONS.rooms).doc(room.id), toRoomDoc(room));
  }
  for (const request of reservations) {
    const reservation = withRisk(request);
    const ref = db.collection(COLLECTIONS.reservations).doc(reservation.id);
    batch.set(ref, toReservationDoc(reservation));
    reservation.history.forEach((entry, index) => {
      batch.set(ref.collection(COLLECTIONS.history).doc(String(index).padStart(4, "0")), entry);
      historyEntries += 1;
    });
  }

  await batch.commit();
  return { rooms: rooms.length, reservations: reservations.length, historyEntries };
}
