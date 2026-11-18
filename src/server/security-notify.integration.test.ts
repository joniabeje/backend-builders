// Approving a request with security risk factors creates one security notification (#47–#49).
import { beforeEach, describe, it } from "vitest";
import assert from "node:assert/strict";
import { RISK_POLICY } from "@/domain/risk";
import type { NewReservation } from "@/domain/reservation";
import { getDb } from "./firestore.server";
import { NotificationsApi } from "./notifications.server";
import { ReservationsApi } from "./reservations.server";
import { seedDatabase } from "./seed.server";
import { clearEmulator } from "./testing/emulator";

const BASE: NewReservation = {
  title: "Quiet Seminar",
  organization: "CEA",
  advisor: "Dr. Okafor",
  advisorEmail: "okafor@howard.edu",
  advisorApproved: true,
  purpose: "Baseline request with no security triggers.",
  date: "2026-10-15",
  startTime: "13:00",
  endTime: "15:00",
  attendance: 20,
  room: "seminar-201",
  hasFood: false,
  externalGuests: false,
  itNeeds: false,
};

describe("security notify on approve (#47, #48, #49)", () => {
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

  it("creates one security notification with details and reasons for external guests", async () => {
    const created = await reservations.createReservation({
      ...BASE,
      title: "Guest Panel",
      externalGuests: true,
    });
    await reservations.reviewReservation(created.id, {
      decision: "approved",
      feedback: "Approved with security note.",
    });

    const listed = await notifications.listByService("security");
    assert.equal(listed.length, 1);
    assert.equal(listed[0]?.reservationId, created.id);
    assert.equal(listed[0]?.details.date, BASE.date);
    assert.equal(listed[0]?.details.startTime, BASE.startTime);
    assert.equal(listed[0]?.details.endTime, BASE.endTime);
    assert.equal(listed[0]?.details.room, "Seminar Room 201");
    assert.equal(listed[0]?.details.attendance, String(BASE.attendance));
    assert.equal(listed[0]?.details.reasons, "External guests");
  });

  it("notifies for after-hours using the same F10 window", async () => {
    const created = await reservations.createReservation({
      ...BASE,
      title: "Evening Review",
      startTime: "18:00",
      endTime: "19:00",
      date: "2026-10-16",
    });
    await reservations.reviewReservation(created.id, { decision: "approved", feedback: "" });

    const listed = await notifications.listByService("security");
    assert.equal(listed.length, 1);
    assert.equal(listed[0]?.details.reasons, "After-hours");
  });

  it("notifies for large attendance", async () => {
    const created = await reservations.createReservation({
      ...BASE,
      title: "Town Hall",
      attendance: RISK_POLICY.largeAttendance,
      room: "lkd-aud",
      date: "2026-10-17",
    });
    await reservations.reviewReservation(created.id, { decision: "approved", feedback: "" });

    const listed = await notifications.listByService("security");
    assert.equal(listed.length, 1);
    assert.equal(listed[0]?.details.room, "Downing Hall Auditorium");
    assert.equal(listed[0]?.details.reasons, `Large attendance (${RISK_POLICY.largeAttendance}+)`);
  });

  it("includes security-staffing when external guests meet the threshold", async () => {
    const created = await reservations.createReservation({
      ...BASE,
      title: "Open House",
      attendance: RISK_POLICY.securityAttendance,
      externalGuests: true,
      room: "arch-mp-b",
      date: "2026-10-18",
    });
    await reservations.reviewReservation(created.id, { decision: "approved", feedback: "" });

    const listed = await notifications.listByService("security");
    assert.equal(listed.length, 1);
    assert.equal(
      listed[0]?.details.reasons,
      [
        "External guests",
        `Security staffing (external guests, ${RISK_POLICY.securityAttendance}+)`,
      ].join("; "),
    );
  });

  it("does not notify when non-qualifying or not approved", async () => {
    const plain = await reservations.createReservation(BASE);
    await reservations.reviewReservation(plain.id, { decision: "approved", feedback: "" });
    assert.equal((await notifications.listByService("security")).length, 0);

    const withGuests = await reservations.createReservation({
      ...BASE,
      title: "Needs changes",
      externalGuests: true,
      date: "2026-10-19",
    });
    await reservations.reviewReservation(withGuests.id, {
      decision: "needs-changes",
      feedback: "Confirm guest list.",
    });
    assert.equal((await notifications.listByService("security")).length, 0);
  });

  it("stays at one security notification if approved again", async () => {
    const created = await reservations.createReservation({
      ...BASE,
      title: "Re-approve guests",
      externalGuests: true,
      date: "2026-10-20",
    });
    await reservations.reviewReservation(created.id, { decision: "approved", feedback: "" });
    await reservations.reviewReservation(created.id, {
      decision: "approved",
      feedback: "Re-confirmed.",
    });
    assert.equal((await notifications.listByService("security")).length, 1);
  });
});
