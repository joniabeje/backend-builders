import { expect, test } from "@playwright/test";

/**
 * HTTP security smoke for PATCH /api/reservations/:id (#63).
 *
 * The default Playwright server uses VITE_USE_MOCKS and no Firestore emulator, so
 * these assertions only run when FIRESTORE_EMULATOR_HOST is set (local full-stack
 * check). CI covers the same cases in src/server/auth-security.integration.test.ts.
 */
const hasEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

test.describe("admin mutation auth", () => {
  test("PATCH without a session returns 401", async ({ request }) => {
    test.skip(
      !hasEmulator,
      "Needs the Firestore emulator; CI runs the integration security smoke.",
    );
    const response = await request.patch("/api/reservations/REQ-1042", {
      data: { decision: "approved", feedback: "" },
    });
    expect(response.status()).toBe(401);
  });

  test("PATCH as a student returns 403", async ({ request }) => {
    test.skip(
      !hasEmulator,
      "Needs the Firestore emulator; CI runs the integration security smoke.",
    );
    const signIn = await request.post("/api/auth/sign-in", {
      data: { email: "student@cea.howard.edu", password: "student-demo" },
    });
    expect(signIn.ok()).toBeTruthy();

    const response = await request.patch("/api/reservations/REQ-1042", {
      data: { decision: "approved", feedback: "" },
    });
    expect(response.status()).toBe(403);
  });
});
