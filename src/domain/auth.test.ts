import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { isRole, ROLES } from "./auth";

describe("roles", () => {
  it("accepts the four CEA roles and rejects anything else", () => {
    for (const role of ROLES) assert.equal(isRole(role), true);
    assert.equal(isRole("superadmin"), false);
    assert.equal(isRole(""), false);
  });
});
