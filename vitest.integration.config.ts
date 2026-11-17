// Integration tests against the Firestore emulator (#13). Run with
// `npm run test:integration`, which starts the emulator, sets FIRESTORE_EMULATOR_HOST,
// runs these tests, and stops it again.
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["src/**/*.integration.test.ts"],
    // Test files share one emulator; running them one at a time keeps their data apart.
    fileParallelism: false,
  },
});
