import { describe, it } from "vitest";
import assert from "node:assert/strict";
import {
  custodialNotificationDetails,
  custodialNotifyReasons,
  shouldNotifyCustodialOnApprove,
} from "./custodial-notification";
import { notificationId, type ServiceNotification } from "./notifications";
import type { ReviewDecision } from "./review-decision";
import { RISK_POLICY } from "./risk";

describe("shouldNotifyCustodialOnApprove (#44)", () => {
  const decisions: ReviewDecision[] = ["approved", "needs-changes", "rejected"];

  it("notifies only when approved and (hasFood or large attendance)", () => {
    for (const decision of decisions) {
      for (const hasFood of [true, false]) {
        for (const attendance of [
          RISK_POLICY.largeAttendance - 1,
          RISK_POLICY.largeAttendance,
          RISK_POLICY.largeAttendance + 10,
        ]) {
          const qualifies = hasFood || attendance >= RISK_POLICY.largeAttendance;
          const expected = decision === "approved" && qualifies;
          assert.equal(
            shouldNotifyCustodialOnApprove({ hasFood, attendance }, decision),
            expected,
            `decision=${decision} hasFood=${hasFood} attendance=${attendance}`,
          );
        }
      }
    }
  });
});

describe("custodialNotifyReasons (#44)", () => {
  it("lists food and/or large attendance using RISK_POLICY", () => {
    assert.deepEqual(custodialNotifyReasons({ hasFood: true, attendance: 20 }), ["Food service"]);
    assert.deepEqual(
      custodialNotifyReasons({
        hasFood: false,
        attendance: RISK_POLICY.largeAttendance,
      }),
      [`Large attendance (${RISK_POLICY.largeAttendance}+)`],
    );
    assert.deepEqual(
      custodialNotifyReasons({
        hasFood: true,
        attendance: RISK_POLICY.largeAttendance,
      }),
      ["Food service", `Large attendance (${RISK_POLICY.largeAttendance}+)`],
    );
    assert.deepEqual(custodialNotifyReasons({ hasFood: false, attendance: 20 }), []);
  });
});

describe("custodialNotificationDetails (#44)", () => {
  it("includes date, time, room, attendance, and reason", () => {
    assert.deepEqual(
      custodialNotificationDetails(
        {
          date: "2026-10-01",
          startTime: "14:00",
          endTime: "16:00",
          room: "innovation",
          attendance: 40,
          hasFood: true,
        },
        "Innovation Lab",
      ),
      {
        date: "2026-10-01",
        startTime: "14:00",
        endTime: "16:00",
        room: "Innovation Lab",
        attendance: "40",
        reason: "Food service",
      },
    );
  });

  it("falls back to the room id when no label is given", () => {
    assert.equal(
      custodialNotificationDetails({
        date: "2026-10-01",
        startTime: "14:00",
        endTime: "16:00",
        room: "seminar-201",
        attendance: RISK_POLICY.largeAttendance,
        hasFood: false,
      }).room,
      "seminar-201",
    );
  });
});

/**
 * Mirrors NotificationsApi.notify idempotency without Firestore: one row per
 * reservationId+service, so "re-approve" cannot create duplicates (#44).
 */
function notifyOnce(
  store: Map<string, ServiceNotification>,
  reservation: { id: string; title: string },
  details: Record<string, string>,
): ServiceNotification {
  const id = notificationId(reservation.id, "custodial");
  const existing = store.get(id);
  if (existing) return existing;
  const created: ServiceNotification = {
    id,
    service: "custodial",
    reservationId: reservation.id,
    title: reservation.title,
    details,
    createdAt: "2026-11-17T21:00:00.000Z",
  };
  store.set(id, created);
  return created;
}

describe("custodial notify idempotency (#44)", () => {
  it("keeps a single custodial row when approve would notify twice", () => {
    const store = new Map<string, ServiceNotification>();
    const reservation = {
      id: "REQ-4001",
      title: "Catered Mixer",
      hasFood: true as const,
      attendance: 30,
    };
    const details = custodialNotificationDetails({
      date: "2026-10-15",
      startTime: "13:00",
      endTime: "15:00",
      room: "seminar-201",
      attendance: reservation.attendance,
      hasFood: reservation.hasFood,
    });

    assert.equal(shouldNotifyCustodialOnApprove(reservation, "approved"), true);
    const first = notifyOnce(store, reservation, details);
    const second = notifyOnce(store, reservation, { ...details, note: "re-approve" });

    assert.equal(first, second);
    assert.equal(store.size, 1);
    assert.equal(
      store.get(notificationId(reservation.id, "custodial"))?.details.reason,
      "Food service",
    );
  });

  it("does not open a custodial row when the trigger is false", () => {
    const store = new Map<string, ServiceNotification>();
    const reservation = {
      id: "REQ-4002",
      title: "Small Seminar",
      hasFood: false as const,
      attendance: 20,
    };
    assert.equal(shouldNotifyCustodialOnApprove(reservation, "approved"), false);
    assert.equal(store.size, 0);
  });
});
