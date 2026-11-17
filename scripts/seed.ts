// npm run seed            rooms, demo reservations, and demo accounts into the emulator
// npm run seed -- --rooms-only   rooms + accounts only; required for a real project
import { EMULATOR_PROJECT_ID, getDb } from "@/server/firestore.server";
import { seedDatabase } from "@/server/seed.server";

const roomsOnly = process.argv.includes("--rooms-only");

if (!process.env.FIREBASE_PROJECT_ID) {
  process.env.FIRESTORE_EMULATOR_HOST ??= "127.0.0.1:8085";
}
const emulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
const target = emulator
  ? `the emulator at ${process.env.FIRESTORE_EMULATOR_HOST} (${EMULATOR_PROJECT_ID})`
  : `the real project ${process.env.FIREBASE_PROJECT_ID}`;

if (!emulator && !roomsOnly) {
  console.error(
    `Refusing to write demo reservations into ${target}. Pass --rooms-only to seed the room catalog and accounts only.`,
  );
  process.exit(1);
}

try {
  const counts = await seedDatabase(getDb(), roomsOnly ? { reservations: [] } : {});
  console.log(
    `Seeded ${target}: ${counts.rooms} rooms, ${counts.reservations} reservations, ` +
      `${counts.historyEntries} history entries, ${counts.users} users.`,
  );
  process.exit(0);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Seeding ${target} failed: ${message}`);
  if (emulator) console.error("Is the emulator running? Start it with `npm run emulators`.");
  process.exit(1);
}
