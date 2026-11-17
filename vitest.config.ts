// Unit tests (#15). Kept separate from vite.config.ts on purpose: the Lovable config
// loads TanStack Start, Cloudflare and Tailwind plugins that the pure domain tests don't
// need, and Vitest uses this file instead of vite.config.ts when both exist.
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    // E2E specs live in e2e/ and run under Playwright, not here. Integration tests need
    // the Firestore emulator and run with vitest.integration.config.ts.
    include: ["src/**/*.test.ts", "docs/**/*.test.ts"],
    exclude: ["src/**/*.integration.test.ts"],
    coverage: {
      provider: "v8",
      // The rules and data layer. UI is covered by the Playwright smoke tests.
      include: ["src/domain/**", "src/data/**", "src/lib/**"],
      exclude: ["**/*.test.ts"],
      reporter: ["text", "html", "lcov"],
    },
  },
});
