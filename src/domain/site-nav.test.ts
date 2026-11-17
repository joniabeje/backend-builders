import { describe, it } from "vitest";
import assert from "node:assert/strict";
import type { PublicUser } from "./auth";
import { siteNavLinks } from "./site-nav";

const user = (role: PublicUser["role"]): PublicUser => ({
  id: role,
  email: `${role}@cea.howard.edu`,
  name: role,
  role,
});

const labels = (role: PublicUser | null) => siteNavLinks(role).map((link) => link.label);

describe("siteNavLinks", () => {
  it("hides Admin for signed-out visitors and non-admin roles", () => {
    assert.deepEqual(labels(null), ["Home", "Rooms", "My Requests"]);
    assert.deepEqual(labels(user("student")), ["Home", "Rooms", "My Requests"]);
    assert.deepEqual(labels(user("advisor")), ["Home", "Rooms", "My Requests"]);
    assert.deepEqual(labels(user("facilities")), ["Home", "Rooms", "My Requests"]);
  });

  it("shows Admin only for the admin role", () => {
    assert.deepEqual(labels(user("admin")), ["Home", "Rooms", "My Requests", "Admin"]);
  });
});
