import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { notificationId, type ServiceNotification } from "./notifications";
import type { ReviewDecision } from "./review-decision";
import { computeRisk, RISK_POLICY } from "./risk";
import {
  SECURITY_TRIGGER_CODES,
  securityNotificationDetails,
  securityTriggerFactors,
  shouldNotifySecurityOnApprove,
} from "./security-notification";

const DAY = {
  date: "2026-10-15",
  startTime: "13:00",
  endTime: "15:00",
  room: "seminar-201",
} as const;

describe("securityTriggerFactors (#47, #49)", () => {
  it("includes external-guests", () => {
    const risk = computeRisk({
      attendance: 20,
      startTime: DAY.startTime,
      endTime: DAY.endTime,
      externalGuests: true,
      hasFood: false,
    });
    assert.deepEqual(
      securityTriggerFactors(risk).map((f) => f.code),
      ["external-guests"],
    );
  });

  it("includes after-hours using the F10 definition", () => {
    const risk = computeRisk({
      attendance: 20,
      startTime: "18:00",
      endTime: "19:00",
      externalGuests: false,
      hasFood: false,
    });
    assert.deepEqual(
      securityTriggerFactors(risk).map((f) => f.code),
      ["after-hours"],
    );
  });

  it("includes large-attendance", () => {
    const risk = computeRisk({
      attendance: RISK_POLICY.largeAttendance,
      startTime: DAY.startTime,
      endTime: DAY.endTime,
      externalGuests: false,
      hasFood: false,
    });
    assert.deepEqual(
      securityTriggerFactors(risk).map((f) => f.code),
      ["large-attendance"],
    );
  });

  it("includes security-staffing with external guests at the security threshold", () => {
    const risk = computeRisk({
      attendance: RISK_POLICY.securityAttendance,
      startTime: DAY.startTime,
      endTime: DAY.endTime,
      externalGuests: true,
      hasFood: false,
    });
    assert.deepEqual(
      securityTriggerFactors(risk).map((f) => f.code),
      ["external-guests", "security-staffing"],
    );
  });

  it("ignores food-service and elevated-attendance alone", () => {
    const risk = computeRisk({
      attendance: RISK_POLICY.elevatedAttendance,
      startTime: DAY.startTime,
      endTime: DAY.endTime,
      externalGuests: false,
      hasFood: true,
    });
    assert.deepEqual(securityTriggerFactors(risk), []);
    assert.ok(risk.factors.some((f) => f.code === "food-service"));
    assert.ok(risk.factors.some((f) => f.code === "elevated-attendance"));
  });
});

describe("shouldNotifySecurityOnApprove (#47, #49)", () => {
  const decisions: ReviewDecision[] = ["approved", "needs-changes", "rejected"];
  const quietRisk = computeRisk({
    attendance: 20,
    startTime: DAY.startTime,
    endTime: DAY.endTime,
    externalGuests: false,
    hasFood: false,
  });
  const guestRisk = computeRisk({
    attendance: 20,
    startTime: DAY.startTime,
    endTime: DAY.endTime,
    externalGuests: true,
    hasFood: false,
  });

  it("notifies only when approved and a security trigger factor is present", () => {
    for (const decision of decisions) {
      assert.equal(
        shouldNotifySecurityOnApprove({ risk: quietRisk }, decision),
        false,
        `quiet decision=${decision}`,
      );
      assert.equal(
        shouldNotifySecurityOnApprove({ risk: guestRisk }, decision),
        decision === "approved",
        `guests decision=${decision}`,
      );
    }
  });

  it("lists the four trigger codes from the epic", () => {
    assert.deepEqual(
      [...SECURITY_TRIGGER_CODES],
      ["external-guests", "after-hours", "large-attendance", "security-staffing"],
    );
  });
});

describe("securityNotificationDetails (#48)", () => {
  it("includes date, time, room, attendance, and each trigger reason", () => {
    const risk = computeRisk({
      attendance: RISK_POLICY.securityAttendance,
      startTime: "18:00",
      endTime: "19:30",
      externalGuests: true,
      hasFood: false,
    });
    const details = securityNotificationDetails(
      {
        ...DAY,
        startTime: "18:00",
        endTime: "19:30",
        attendance: RISK_POLICY.securityAttendance,
        risk,
      },
      "Seminar Room 201",
    );
    assert.equal(details.date, DAY.date);
    assert.equal(details.startTime, "18:00");
    assert.equal(details.endTime, "19:30");
    assert.equal(details.room, "Seminar Room 201");
    assert.equal(details.attendance, String(RISK_POLICY.securityAttendance));
    assert.equal(
      details.reasons,
      [
        "External guests",
        "After-hours",
        `Security staffing (external guests, ${RISK_POLICY.securityAttendance}+)`,
      ].join("; "),
    );
  });

  it("falls back to the room id when no label is given", () => {
    const risk = computeRisk({
      attendance: 20,
      startTime: DAY.startTime,
      endTime: DAY.endTime,
      externalGuests: true,
      hasFood: false,
    });
    assert.equal(
      securityNotificationDetails({
        ...DAY,
        attendance: 20,
        risk,
      }).room,
      "seminar-201",
    );
  });
});

function notifyOnce(
  store: Map<string, ServiceNotification>,
  reservation: { id: string; title: string },
  details: Record<string, string>,
): ServiceNotification {
  const id = notificationId(reservation.id, "security");
  const existing = store.get(id);
  if (existing) return existing;
  const created: ServiceNotification = {
    id,
    service: "security",
    reservationId: reservation.id,
    title: reservation.title,
    details,
    createdAt: "2026-11-17T21:00:00.000Z",
  };
  store.set(id, created);
  return created;
}

describe("security notify idempotency (#49)", () => {
  it("keeps a single security row when approve would notify twice", () => {
    const store = new Map<string, ServiceNotification>();
    const risk = computeRisk({
      attendance: 20,
      startTime: DAY.startTime,
      endTime: DAY.endTime,
      externalGuests: true,
      hasFood: false,
    });
    const reservation = { id: "REQ-5001", title: "Guest Talk", risk };
    const details = securityNotificationDetails({
      ...DAY,
      attendance: 20,
      risk,
    });

    assert.equal(shouldNotifySecurityOnApprove(reservation, "approved"), true);
    const first = notifyOnce(store, reservation, details);
    const second = notifyOnce(store, reservation, { ...details, note: "re-approve" });
    assert.equal(first, second);
    assert.equal(store.size, 1);
  });
});
