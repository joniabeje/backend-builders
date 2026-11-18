import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { itNotificationDetails, shouldNotifyItOnApprove } from "./it-notification";
import { notificationId, type ServiceNotification } from "./notifications";
import type { ReviewDecision } from "./review-decision";

describe("shouldNotifyItOnApprove (#43)", () => {
  const decisions: ReviewDecision[] = ["approved", "needs-changes", "rejected"];

  it("notifies only when the decision is approved and itNeeds is true", () => {
    for (const decision of decisions) {
      for (const itNeeds of [true, false]) {
        const expected = decision === "approved" && itNeeds;
        assert.equal(
          shouldNotifyItOnApprove({ itNeeds }, decision),
          expected,
          `decision=${decision} itNeeds=${itNeeds}`,
        );
      }
    }
  });
});

describe("itNotificationDetails (#43)", () => {
  it("includes date, time, room, and equipment", () => {
    assert.deepEqual(
      itNotificationDetails(
        {
          date: "2026-10-01",
          startTime: "14:00",
          endTime: "16:00",
          room: "innovation",
        },
        "Innovation Lab",
      ),
      {
        date: "2026-10-01",
        startTime: "14:00",
        endTime: "16:00",
        room: "Innovation Lab",
        equipment: "IT/AV equipment",
      },
    );
  });

  it("falls back to the room id when no label is given", () => {
    assert.equal(
      itNotificationDetails({
        date: "2026-10-01",
        startTime: "14:00",
        endTime: "16:00",
        room: "seminar-201",
      }).room,
      "seminar-201",
    );
  });
});

/**
 * Mirrors NotificationsApi.notify idempotency without Firestore: one row per
 * reservationId+service, so "re-approve" cannot create duplicates (#43).
 */
function notifyOnce(
  store: Map<string, ServiceNotification>,
  reservation: { id: string; title: string },
  details: Record<string, string>,
): ServiceNotification {
  const id = notificationId(reservation.id, "it");
  const existing = store.get(id);
  if (existing) return existing;
  const created: ServiceNotification = {
    id,
    service: "it",
    reservationId: reservation.id,
    title: reservation.title,
    details,
    createdAt: "2026-11-17T21:00:00.000Z",
  };
  store.set(id, created);
  return created;
}

describe("IT notify idempotency (#43)", () => {
  it("keeps a single IT row when approve would notify twice", () => {
    const store = new Map<string, ServiceNotification>();
    const reservation = { id: "REQ-3001", title: "AV Night", itNeeds: true as const };
    const details = itNotificationDetails({
      date: "2026-10-15",
      startTime: "13:00",
      endTime: "15:00",
      room: "seminar-201",
    });

    assert.equal(shouldNotifyItOnApprove(reservation, "approved"), true);
    const first = notifyOnce(store, reservation, details);
    const second = notifyOnce(store, reservation, { ...details, note: "re-approve" });

    assert.equal(first, second);
    assert.equal(store.size, 1);
    assert.equal(
      store.get(notificationId(reservation.id, "it"))?.details.equipment,
      "IT/AV equipment",
    );
  });

  it("does not open an IT row when the trigger is false", () => {
    const store = new Map<string, ServiceNotification>();
    const reservation = { id: "REQ-3002", title: "No AV", itNeeds: false as const };
    assert.equal(shouldNotifyItOnApprove(reservation, "approved"), false);
    assert.equal(store.size, 0);
  });
});
