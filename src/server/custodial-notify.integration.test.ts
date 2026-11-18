// Approving a food or large-attendance request creates one custodial notification (#44).
import { beforeEach, describe, it } from "vitest";
import assert from "node:assert/strict";
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

describe("custodial notify on approve (#44)", () => {
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

  it("creates one custodial notification for food with date, time, room, attendance", async () => {
    const created = await reservations.createReservation(WITH_FOOD);
    await reservations.reviewReservation(created.id, {
      decision: "approved",
      feedback: "Approved with catering.",
    });

    const listed = await notifications.listByService("custodial");
    assert.equal(listed.length, 1);
    assert.equal(listed[0]?.reservationId, created.id);
    assert.equal(listed[0]?.details.date, WITH_FOOD.date);
    assert.equal(listed[0]?.details.startTime, WITH_FOOD.startTime);
    assert.equal(listed[0]?.details.endTime, WITH_FOOD.endTime);
    assert.equal(listed[0]?.details.room, "Seminar Room 201");
    assert.equal(listed[0]?.details.attendance, String(WITH_FOOD.attendance));
    assert.equal(listed[0]?.details.reason, "Food service");
  });

  it("creates one custodial notification for large attendance without food", async () => {
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
    assert.equal(listed.length, 1);
    assert.equal(listed[0]?.details.room, "Downing Hall Auditorium");
    assert.equal(listed[0]?.details.attendance, String(RISK_POLICY.largeAttendance));
    assert.equal(listed[0]?.details.reason, `Large attendance (${RISK_POLICY.largeAttendance}+)`);
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

  it("stays at one custodial notification if the request is approved again", async () => {
    const created = await reservations.createReservation(WITH_FOOD);
    await reservations.reviewReservation(created.id, { decision: "approved", feedback: "" });
    await reservations.reviewReservation(created.id, {
      decision: "approved",
      feedback: "Re-confirmed.",
    });
    assert.equal((await notifications.listByService("custodial")).length, 1);
  });
});
