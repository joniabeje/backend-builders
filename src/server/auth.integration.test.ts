import { beforeEach, describe, it } from "vitest";
import assert from "node:assert/strict";
import { ROLES } from "@/domain/auth";
import {
  AuthApi,
  ForbiddenError,
  InvalidCredentialsError,
  UnauthorizedError,
} from "./auth.server";
import { getDb } from "./firestore.server";
import { SEED_ACCOUNTS } from "./seed-accounts";
import { clearEmulator } from "./testing/emulator";

describe("AuthApi", () => {
  let api: AuthApi;

  beforeEach(async () => {
    await clearEmulator();
    api = new AuthApi(getDb(), { now: () => new Date("2026-11-17T18:00:00.000Z") });
    await api.seedAccounts();
  });

  it("seeds one account per role", async () => {
    assert.equal(SEED_ACCOUNTS.length, ROLES.length);
    assert.deepEqual(SEED_ACCOUNTS.map((account) => account.role).sort(), [...ROLES].sort());
  });

  it("signs in each seeded account and stores its role on the session", async () => {
    for (const account of SEED_ACCOUNTS) {
      const { session, user } = await api.signIn(account.email, account.password);
      assert.equal(user.role, account.role);
      assert.equal(user.email, account.email);
      assert.equal(session.role, account.role);
      assert.equal(session.userId, account.id);

      const current = await api.requireSession(session.id);
      assert.equal(current.user.role, account.role);
      assert.equal(current.session.id, session.id);
    }
  });

  it("rejects a wrong password without revealing which field failed", async () => {
    await assert.rejects(
      () => api.signIn("admin@cea.howard.edu", "wrong"),
      (error: unknown) => {
        assert.ok(error instanceof InvalidCredentialsError);
        assert.match(error.message, /Invalid email or password/);
        return true;
      },
    );
  });

  it("requireSession fails when signed out or after sign-out", async () => {
    await assert.rejects(() => api.requireSession(null), UnauthorizedError);
    const { session } = await api.signIn("student@cea.howard.edu", "student-demo");
    await api.signOut(session.id);
    await assert.rejects(() => api.requireSession(session.id), UnauthorizedError);
  });

  it("expires sessions past expiresAt", async () => {
    const shortLived = new AuthApi(getDb(), {
      now: () => new Date("2026-11-17T18:00:00.000Z"),
      sessionTtlMs: 1_000,
    });
    await shortLived.seedAccounts();
    const { session } = await shortLived.signIn("admin@cea.howard.edu", "admin-demo");

    const later = new AuthApi(getDb(), {
      now: () => new Date("2026-11-17T18:00:02.000Z"),
    });
    await assert.rejects(() => later.requireSession(session.id), UnauthorizedError);
  });

  it("requireAdmin allows admins and rejects everyone else", async () => {
    await assert.rejects(() => api.requireAdmin(null), UnauthorizedError);

    const student = await api.signIn("student@cea.howard.edu", "student-demo");
    await assert.rejects(() => api.requireAdmin(student.session.id), ForbiddenError);

    const admin = await api.signIn("admin@cea.howard.edu", "admin-demo");
    const allowed = await api.requireAdmin(admin.session.id);
    assert.equal(allowed.user.role, "admin");
  });
});
