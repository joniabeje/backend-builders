// Approving an itNeeds request creates exactly one IT notification (#42).
import { beforeEach, describe, it } from "vitest";
import assert from "node:assert/strict";
import type { NewReservation } from "@/domain/reservation";
import { getDb } from "./firestore.server";
import { NotificationsApi } from "./notifications.server";
import { ReservationsApi } from "./reservations.server";
import { seedDatabase } from "./seed.server";
import { clearEmulator } from "./testing/emulator";

const WITH_IT: NewReservation = {
  title: "AV Setup Workshop",
  organization: "CEA",
  advisor: "Dr. Okafor",
  advisorEmail: "okafor@howard.edu",
  advisorApproved: true,
  purpose: "Needs projector and mics.",
  date: "2026-10-15",
  startTime: "13:00",
  endTime: "15:00",
  attendance: 20,
  room: "seminar-201",
  hasFood: false,
  externalGuests: false,
  itNeeds: true,
};

describe("IT notify on approve (#42)", () => {
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

  it("creates one IT notification with date, time, room, and equipment", async () => {
    const created = await reservations.createReservation(WITH_IT);
    await reservations.reviewReservation(created.id, {
      decision: "approved",
      feedback: "Approved with AV.",
    });

    const listed = await notifications.listByService("it");
    assert.equal(listed.length, 1);
    assert.equal(listed[0]?.reservationId, created.id);
    assert.equal(listed[0]?.details.date, WITH_IT.date);
    assert.equal(listed[0]?.details.startTime, WITH_IT.startTime);
    assert.equal(listed[0]?.details.endTime, WITH_IT.endTime);
    assert.equal(listed[0]?.details.room, "Seminar Room 201");
    assert.equal(listed[0]?.details.equipment, "IT/AV equipment");
  });

  it("does not notify when itNeeds is false or the decision is not approve", async () => {
    const plain = await reservations.createReservation({ ...WITH_IT, itNeeds: false });
    await reservations.reviewReservation(plain.id, { decision: "approved", feedback: "" });
    assert.equal((await notifications.listByService("it")).length, 0);

    const withIt = await reservations.createReservation({
      ...WITH_IT,
      title: "Needs changes first",
      date: "2026-10-16",
    });
    await reservations.reviewReservation(withIt.id, {
      decision: "needs-changes",
      feedback: "Please confirm AV list.",
    });
    assert.equal((await notifications.listByService("it")).length, 0);
  });

  it("stays at one IT notification if the request is approved again", async () => {
    const created = await reservations.createReservation(WITH_IT);
    await reservations.reviewReservation(created.id, { decision: "approved", feedback: "" });
    await reservations.reviewReservation(created.id, {
      decision: "approved",
      feedback: "Re-confirmed.",
    });
    assert.equal((await notifications.listByService("it")).length, 1);
  });
});
