import { beforeEach, describe, it } from "vitest";
import assert from "node:assert/strict";
import { notificationId, type ServiceNotification } from "@/domain/notifications";
import { getDb } from "./firestore.server";
import type { NotificationDelivery } from "./notification-delivery.server";
import { NotificationsApi } from "./notifications.server";
import { clearEmulator } from "./testing/emulator";

const RESERVATION = { id: "REQ-2001", title: "Robotics Demo" };
const DETAILS = {
  date: "2026-10-01",
  startTime: "14:00",
  endTime: "16:00",
  room: "innovation",
  equipment: "projector",
};

function recordingDelivery(): NotificationDelivery & { delivered: ServiceNotification[] } {
  const delivered: ServiceNotification[] = [];
  return {
    delivered,
    deliver(notification) {
      delivered.push(notification);
    },
  };
}

describe("NotificationsApi (#40, #41)", () => {
  let api: NotificationsApi;
  let delivery: ReturnType<typeof recordingDelivery>;

  beforeEach(async () => {
    await clearEmulator();
    delivery = recordingDelivery();
    api = new NotificationsApi(getDb(), {
      now: () => new Date("2026-11-17T20:00:00.000Z"),
      delivery,
    });
  });

  it("stores a notification, delivers it once, and lists it by service", async () => {
    const created = await api.notify("it", RESERVATION, DETAILS);
    assert.equal(created.id, notificationId(RESERVATION.id, "it"));
    assert.equal(created.service, "it");
    assert.equal(created.reservationId, RESERVATION.id);
    assert.equal(created.title, RESERVATION.title);
    assert.deepEqual(created.details, DETAILS);
    assert.equal(created.createdAt, "2026-11-17T20:00:00.000Z");
    assert.deepEqual(delivery.delivered, [created]);

    const listed = await api.listByService("it");
    assert.equal(listed.length, 1);
    assert.deepEqual(listed[0], created);
    assert.equal((await api.listByService("custodial")).length, 0);
  });

  it("is idempotent for the same reservation and service", async () => {
    const first = await api.notify("security", RESERVATION, DETAILS);
    const second = await api.notify("security", RESERVATION, {
      ...DETAILS,
      note: "should not replace",
    });
    assert.deepEqual(second, first);
    assert.equal((await api.listByService("security")).length, 1);
    assert.equal(delivery.delivered.length, 1);
  });

  it("keeps separate rows for different services on the same reservation", async () => {
    await api.notify("it", RESERVATION, DETAILS);
    await api.notify("custodial", RESERVATION, { ...DETAILS, reason: "food" });
    assert.equal((await api.listByService("it")).length, 1);
    assert.equal((await api.listByService("custodial")).length, 1);
    assert.equal(delivery.delivered.length, 2);
  });

  it("keeps separate rows for variants of the same service (#45)", async () => {
    const setup = await api.notify(
      "custodial",
      RESERVATION,
      { ...DETAILS, phase: "setup" },
      { variant: "setup" },
    );
    const cleanup = await api.notify(
      "custodial",
      RESERVATION,
      { ...DETAILS, phase: "cleanup" },
      { variant: "cleanup" },
    );
    assert.equal(setup.id, notificationId(RESERVATION.id, "custodial", "setup"));
    assert.equal(cleanup.id, notificationId(RESERVATION.id, "custodial", "cleanup"));
    assert.equal((await api.listByService("custodial")).length, 2);
    assert.equal(delivery.delivered.length, 2);

    const again = await api.notify(
      "custodial",
      RESERVATION,
      { ...DETAILS, phase: "setup", note: "re-notify" },
      { variant: "setup" },
    );
    assert.deepEqual(again, setup);
    assert.equal(delivery.delivered.length, 2);
  });
});
