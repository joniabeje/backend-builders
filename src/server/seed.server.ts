// Seed data for a fresh database: CEA rooms (#58), demo reservations, and one account
// per role (#60). Run with `npm run seed`.
import type { Firestore } from "firebase-admin/firestore";
import type { UnscoredEventRequest } from "@/domain/reservation";
import { withRisk } from "@/domain/risk";
import { MOCK_REQUESTS } from "@/lib/mock-requests";
import { ROOMS, type Room } from "@/lib/rooms";
import { AuthApi } from "./auth.server";
import { COLLECTIONS, toReservationDoc, toRoomDoc } from "./schema.server";
import { SEED_ACCOUNTS, type SeedAccount } from "./seed-accounts";

export type SeedCounts = {
  rooms: number;
  reservations: number;
  historyEntries: number;
  users: number;
};

export type SeedOptions = {
  rooms?: readonly Room[];
  /** Demo requests. Pass [] to seed rooms (and users) only, e.g. into a real project. */
  reservations?: readonly UnscoredEventRequest[];
  /** Demo accounts. Pass [] to skip users. */
  accounts?: readonly SeedAccount[];
};

/**
 * Writes rooms, reservations and demo users. Room and reservation documents have fixed
 * ids so re-running overwrites instead of duplicating. Risk is computed here, as the API
 * does on submit. Users are hashed and written through AuthApi.
 */
export async function seedDatabase(
  db: Firestore,
  { rooms = ROOMS, reservations = MOCK_REQUESTS, accounts = SEED_ACCOUNTS }: SeedOptions = {},
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
  const users = accounts.length > 0 ? await new AuthApi(db).seedAccounts(accounts) : 0;

  return {
    rooms: rooms.length,
    reservations: reservations.length,
    historyEntries,
    users,
  };
}
