import { beforeEach, describe, it } from "vitest";
import assert from "node:assert/strict";
import { notificationId } from "@/domain/notifications";
import { getDb } from "./firestore.server";
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

describe("NotificationsApi (#40)", () => {
  let api: NotificationsApi;

  beforeEach(async () => {
    await clearEmulator();
    api = new NotificationsApi(getDb(), {
      now: () => new Date("2026-11-17T20:00:00.000Z"),
    });
  });

  it("stores a notification and lists it by service", async () => {
    const created = await api.notify("it", RESERVATION, DETAILS);
    assert.equal(created.id, notificationId(RESERVATION.id, "it"));
    assert.equal(created.service, "it");
    assert.equal(created.reservationId, RESERVATION.id);
    assert.equal(created.title, RESERVATION.title);
    assert.deepEqual(created.details, DETAILS);
    assert.equal(created.createdAt, "2026-11-17T20:00:00.000Z");

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
  });

  it("keeps separate rows for different services on the same reservation", async () => {
    await api.notify("it", RESERVATION, DETAILS);
    await api.notify("custodial", RESERVATION, { ...DETAILS, reason: "food" });
    assert.equal((await api.listByService("it")).length, 1);
    assert.equal((await api.listByService("custodial")).length, 1);
  });
});
