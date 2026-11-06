import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { EventRequest } from "./reservation.ts";
import {
  applyReviewDecision,
  isDecisionFeedbackValid,
  isReviewDecision,
  latestFeedback,
  ReviewFeedbackError,
} from "./review-decision.ts";

const request = (overrides: Partial<EventRequest> = {}): EventRequest => ({
  id: "REQ-1",
  title: "NSBE General Body Meeting",
  organization: "NSBE",
  requester: "J. Abeje",
  date: "2026-11-04",
  startTime: "12:00",
  endTime: "13:00",
  attendance: 40,
  room: "lkd-confa",
  status: "pending",
  hasFood: false,
  externalGuests: false,
  afterHours: false,
  itNeeds: false,
  submittedAt: "2026-10-20",
  history: [],
  ...overrides,
});

const ACTOR = "Dean's Office";
const T1 = "2026-11-06T04:13:00.000Z";
const T2 = "2026-11-06T04:14:00.000Z";

describe("isDecisionFeedbackValid", () => {
  it("lets Approve go through with no feedback", () => {
    assert.equal(isDecisionFeedbackValid("approved", ""), true);
  });

  for (const decision of ["rejected", "needs-changes"] as const) {
    it(`requires at least 10 trimmed characters for ${decision}`, () => {
      assert.equal(isDecisionFeedbackValid(decision, "123456789"), false);
      assert.equal(isDecisionFeedbackValid(decision, "   123456789   "), false);
      assert.equal(isDecisionFeedbackValid(decision, "1234567890"), true);
    });
  }
});

describe("isReviewDecision", () => {
  it("accepts the three admin decisions and nothing else", () => {
    assert.equal(isReviewDecision("approved"), true);
    assert.equal(isReviewDecision("needs-changes"), true);
    assert.equal(isReviewDecision("rejected"), true);
    assert.equal(isReviewDecision("pending"), false);
    assert.equal(isReviewDecision(undefined), false);
  });
});

describe("applyReviewDecision", () => {
  it("appends history in order and leaves the input untouched", () => {
    const initial = request();
    const first = applyReviewDecision(
      initial,
      { decision: "needs-changes", feedback: "  Please reduce attendance.  " },
      ACTOR,
      T1,
    );
    const second = applyReviewDecision(
      first,
      { decision: "rejected", feedback: "Room unavailable that day." },
      ACTOR,
      T2,
    );

    assert.equal(second.status, "rejected");
    assert.deepEqual(second.history, [
      {
        from: "pending",
        to: "needs-changes",
        actor: ACTOR,
        feedback: "Please reduce attendance.",
        at: T1,
      },
      {
        from: "needs-changes",
        to: "rejected",
        actor: ACTOR,
        feedback: "Room unavailable that day.",
        at: T2,
      },
    ]);
    assert.deepEqual(initial.history, []);
    assert.equal(initial.status, "pending");
  });

  it("omits the feedback field when Approve has none", () => {
    const approved = applyReviewDecision(
      request(),
      { decision: "approved", feedback: "   " },
      ACTOR,
      T1,
    );
    assert.equal(approved.status, "approved");
    assert.equal("feedback" in approved.history[0], false);
  });

  it("throws ReviewFeedbackError for short feedback on Reject or Request changes", () => {
    for (const decision of ["rejected", "needs-changes"] as const) {
      assert.throws(
        () => applyReviewDecision(request(), { decision, feedback: "short" }, ACTOR, T1),
        ReviewFeedbackError,
      );
    }
  });
});

describe("latestFeedback", () => {
  it("returns the newest entry that has feedback", () => {
    const reviewed = applyReviewDecision(
      applyReviewDecision(
        request(),
        { decision: "needs-changes", feedback: "Please reduce attendance." },
        ACTOR,
        T1,
      ),
      { decision: "rejected", feedback: "Room unavailable that day." },
      ACTOR,
      T2,
    );
    assert.equal(latestFeedback(reviewed.history)?.feedback, "Room unavailable that day.");
  });

  it("skips entries without feedback and handles an empty history", () => {
    const reviewed = applyReviewDecision(
      applyReviewDecision(
        request(),
        { decision: "rejected", feedback: "Room unavailable that day." },
        ACTOR,
        T1,
      ),
      { decision: "approved", feedback: "" },
      ACTOR,
      T2,
    );
    assert.equal(latestFeedback(reviewed.history)?.at, T1);
    assert.equal(latestFeedback([]), undefined);
  });
});
