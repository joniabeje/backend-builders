// Qualifying approvals create exactly one pre and one post custodial notification (#44, #45).
import { beforeEach, describe, it } from "vitest";
import assert from "node:assert/strict";
import { notificationId } from "@/domain/notifications";
import { RISK_POLICY } from "@/domain/risk";
import type { NewReservation } from "@/domain/reservation";
import { getDb } from "./firestore.server";
import { NotificationsApi } from "./notifications.server";
import { ReservationsApi } from "./reservations.server";
import { seedDatabase } from "./seed.server";
import { clearEmulator } from "./testing/emulator";

const WITH_FOOD: NewReservation = {
  title: "Catered Mixer",
  organization: "CEA",
  advisor: "Dr. Okafor",
  advisorEmail: "okafor@howard.edu",
  advisorApproved: true,
  purpose: "Needs catering setup and cleanup.",
  date: "2026-10-15",
  startTime: "13:00",
  endTime: "15:00",
  attendance: 20,
  room: "seminar-201",
  hasFood: true,
  externalGuests: false,
  itNeeds: false,
};

describe("custodial notify on approve (#44, #45)", () => {
  let reservations: ReservationsApi;
  let notifications: NotificationsApi;

  beforeEach(async () => {
    await clearEmulator();
    await seedDatabase(getDb(), { reservations: [] });
    notifications = new NotificationsApi(getDb(), {
      now: () => new Date("2026-11-17T21:00:00.000Z"),
      delivery: { deliver() {} },
    });
    reservations = new ReservationsApi(getDb(), {
      reviewer: "Demo Admin",
      notifications,
    });
  });

  it("creates one setup and one cleanup notification for food", async () => {
    const created = await reservations.createReservation(WITH_FOOD);
    await reservations.reviewReservation(created.id, {
      decision: "approved",
      feedback: "Approved with catering.",
    });

    const listed = await notifications.listByService("custodial");
    assert.equal(listed.length, 2);
    const byId = new Map(listed.map((row) => [row.id, row]));
    const setup = byId.get(notificationId(created.id, "custodial", "setup"));
    const cleanup = byId.get(notificationId(created.id, "custodial", "cleanup"));
    assert.ok(setup);
    assert.ok(cleanup);

    for (const row of [setup, cleanup]) {
      assert.equal(row.reservationId, created.id);
      assert.equal(row.details.date, WITH_FOOD.date);
      assert.equal(row.details.startTime, WITH_FOOD.startTime);
      assert.equal(row.details.endTime, WITH_FOOD.endTime);
      assert.equal(row.details.room, "Seminar Room 201");
      assert.equal(row.details.attendance, String(WITH_FOOD.attendance));
      assert.equal(row.details.reason, "Food service");
    }
    assert.equal(setup.details.phase, "setup");
    assert.equal(setup.details.task, "Pre-event setup");
    assert.equal(cleanup.details.phase, "cleanup");
    assert.equal(cleanup.details.task, "Post-event cleaning");
  });

  it("creates setup and cleanup for large attendance without food", async () => {
    const created = await reservations.createReservation({
      ...WITH_FOOD,
      title: "Town Hall",
      hasFood: false,
      attendance: RISK_POLICY.largeAttendance,
      room: "lkd-aud",
      date: "2026-10-16",
    });
    await reservations.reviewReservation(created.id, {
      decision: "approved",
      feedback: "",
    });

    const listed = await notifications.listByService("custodial");
    assert.equal(listed.length, 2);
    assert.ok(listed.every((row) => row.details.room === "Downing Hall Auditorium"));
    assert.ok(
      listed.every((row) => row.details.attendance === String(RISK_POLICY.largeAttendance)),
    );
    assert.ok(
      listed.every(
        (row) => row.details.reason === `Large attendance (${RISK_POLICY.largeAttendance}+)`,
      ),
    );
    assert.deepEqual(listed.map((row) => row.details.phase).sort(), ["cleanup", "setup"]);
  });

  it("does not notify when the request is non-qualifying or not approved", async () => {
    const plain = await reservations.createReservation({
      ...WITH_FOOD,
      hasFood: false,
      attendance: 20,
    });
    await reservations.reviewReservation(plain.id, { decision: "approved", feedback: "" });
    assert.equal((await notifications.listByService("custodial")).length, 0);

    const withFood = await reservations.createReservation({
      ...WITH_FOOD,
      title: "Needs changes first",
      date: "2026-10-17",
    });
    await reservations.reviewReservation(withFood.id, {
      decision: "needs-changes",
      feedback: "Confirm catering count.",
    });
    assert.equal((await notifications.listByService("custodial")).length, 0);
  });

  it("stays at one setup and one cleanup if the request is approved again", async () => {
    const created = await reservations.createReservation(WITH_FOOD);
    await reservations.reviewReservation(created.id, { decision: "approved", feedback: "" });
    await reservations.reviewReservation(created.id, {
      decision: "approved",
      feedback: "Re-confirmed.",
    });
    const listed = await notifications.listByService("custodial");
    assert.equal(listed.length, 2);
    assert.deepEqual(listed.map((row) => row.details.phase).sort(), ["cleanup", "setup"]);
  });
});
