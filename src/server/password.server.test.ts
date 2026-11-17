import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { hashPassword, verifyPassword } from "./password.server";

describe("password hashing", () => {
  it("verifies the original password and rejects a wrong one", async () => {
    const record = await hashPassword("admin-demo");
    assert.equal(await verifyPassword("admin-demo", record), true);
    assert.equal(await verifyPassword("nope", record), false);
  });

  it("uses a fresh salt each time", async () => {
    const a = await hashPassword("same");
    const b = await hashPassword("same");
    assert.notEqual(a.passwordSalt, b.passwordSalt);
    assert.notEqual(a.passwordHash, b.passwordHash);
  });
});
