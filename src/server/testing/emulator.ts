// Helpers for *.integration.test.ts files, which run against the Firestore emulator.
import { EMULATOR_PROJECT_ID } from "../firestore.server";

export function emulatorUrl(path: string): string {
  const host = process.env.FIRESTORE_EMULATOR_HOST;
  if (!host) throw new Error("FIRESTORE_EMULATOR_HOST is not set; run npm run test:integration.");
  return `http://${host}${path}`;
}

/** Firestore's REST path for a document, as a browser using the client SDK would call it. */
export function documentUrl(documentPath: string): string {
  return emulatorUrl(
    `/v1/projects/${EMULATOR_PROJECT_ID}/databases/(default)/documents/${documentPath}`,
  );
}

/** Deletes every document in the emulator, so each test starts from an empty database. */
export async function clearEmulator(): Promise<void> {
  const response = await fetch(
    emulatorUrl(`/emulator/v1/projects/${EMULATOR_PROJECT_ID}/databases/(default)/documents`),
    { method: "DELETE" },
  );
  if (!response.ok) throw new Error(`Could not clear the emulator: HTTP ${response.status}`);
}
