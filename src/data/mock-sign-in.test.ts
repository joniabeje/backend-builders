import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { mockSignIn } from "./mock-sign-in";

describe("mockSignIn", () => {
  it("accepts the seeded admin account", () => {
    assert.deepEqual(mockSignIn("admin@cea.howard.edu", "admin-demo"), {
      id: "admin",
      email: "admin@cea.howard.edu",
      name: "Demo Admin",
      role: "admin",
    });
  });

  it("trims and lowercases the email", () => {
    assert.equal(mockSignIn("  Admin@CEA.Howard.Edu  ", "admin-demo")?.role, "admin");
  });

  it("rejects a wrong password or unknown email", () => {
    assert.equal(mockSignIn("admin@cea.howard.edu", "wrong"), null);
    assert.equal(mockSignIn("nobody@cea.howard.edu", "admin-demo"), null);
  });
});
