import { describe, it } from "vitest";
import assert from "node:assert/strict";
import type { ServiceNotification } from "@/domain/notifications";
import {
  ConsoleNotificationAdapter,
  createNotificationDelivery,
} from "./notification-delivery.server";

const SAMPLE: ServiceNotification = {
  id: "REQ-2001_it",
  service: "it",
  reservationId: "REQ-2001",
  title: "Robotics Demo",
  details: { room: "innovation", equipment: "projector" },
  createdAt: "2026-11-17T20:00:00.000Z",
};

describe("ConsoleNotificationAdapter", () => {
  it("logs the service, reservation id, title, and details", () => {
    const lines: unknown[][] = [];
    const adapter = new ConsoleNotificationAdapter((...args) => {
      lines.push(args);
    });
    adapter.deliver(SAMPLE);
    assert.equal(lines.length, 1);
    assert.equal(lines[0][0], "[cea:notify:it] REQ-2001 — Robotics Demo");
    assert.deepEqual(lines[0][1], SAMPLE.details);
  });
});

describe("createNotificationDelivery", () => {
  it("defaults to the console adapter with no credentials", () => {
    assert.ok(createNotificationDelivery({}) instanceof ConsoleNotificationAdapter);
    assert.ok(
      createNotificationDelivery({ NOTIFICATION_DELIVERY: "console" }) instanceof
        ConsoleNotificationAdapter,
    );
  });
});
