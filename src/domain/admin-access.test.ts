import { describe, it } from "vitest";
import assert from "node:assert/strict";
import type { PublicUser } from "./auth";
import { adminAccess } from "./admin-access";

const user = (role: PublicUser["role"]): PublicUser => ({
  id: role,
  email: `${role}@cea.howard.edu`,
  name: role,
  role,
});

describe("adminAccess", () => {
  it("sends signed-out visitors to login", () => {
    assert.equal(adminAccess(null), "login");
  });

  it("allows only the admin role", () => {
    assert.equal(adminAccess(user("admin")), "ok");
    assert.equal(adminAccess(user("student")), "forbidden");
    assert.equal(adminAccess(user("advisor")), "forbidden");
    assert.equal(adminAccess(user("facilities")), "forbidden");
  });
});
