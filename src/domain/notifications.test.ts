import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { isNotificationService, notificationId, NOTIFICATION_SERVICES } from "./notifications";

describe("notifications domain", () => {
  it("accepts only the three service names", () => {
    assert.deepEqual([...NOTIFICATION_SERVICES], ["it", "custodial", "security"]);
    assert.equal(isNotificationService("it"), true);
    assert.equal(isNotificationService("email"), false);
  });

  it("builds a stable per-reservation per-service id", () => {
    assert.equal(notificationId("REQ-1043", "it"), "REQ-1043_it");
    assert.equal(notificationId("REQ-1043", "custodial"), "REQ-1043_custodial");
  });

  it("appends an optional variant for multi-row services (#45)", () => {
    assert.equal(notificationId("REQ-1043", "custodial", "setup"), "REQ-1043_custodial_setup");
    assert.equal(notificationId("REQ-1043", "custodial", "cleanup"), "REQ-1043_custodial_cleanup");
  });
});
