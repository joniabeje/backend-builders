// Server-only Firestore access (docs/ARCHITECTURE.md, ADR-1). The ".server." in the file
// name makes TanStack Start's import protection fail the build if browser code imports it.
import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

/** Placeholder project for the emulator. "demo-" projects never reach Google's servers. */
export const EMULATOR_PROJECT_ID = "demo-cea-reserve";

let db: Firestore | undefined;

/**
 * The Firestore database for this server process. With FIRESTORE_EMULATOR_HOST set
 * (npm run emulators, npm run test:integration) the Admin SDK talks to the local
 * emulator; otherwise it uses FIREBASE_PROJECT_ID and Application Default Credentials.
 */
export function getDb(): Firestore {
  if (db) return db;

  const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST;
  const projectId = process.env.FIREBASE_PROJECT_ID ?? (emulatorHost ? EMULATOR_PROJECT_ID : "");
  if (!projectId) {
    throw new Error(
      "Firestore is not configured. Run `npm run emulators` and set " +
        "FIRESTORE_EMULATOR_HOST=127.0.0.1:8085, or set FIREBASE_PROJECT_ID for a real project.",
    );
  }

  // The emulator needs no credentials. Without this, the Admin SDK first probes the
  // Google Cloud metadata server and the first request waits for that to time out.
  if (emulatorHost) process.env.METADATA_SERVER_DETECTION ??= "none";

  const app = getApps()[0] ?? initializeApp({ projectId });
  db = getFirestore(app);
  return db;
}
