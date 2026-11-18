import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { itNotificationDetails, shouldNotifyItOnApprove } from "./it-notification";

describe("shouldNotifyItOnApprove", () => {
  it("is true only when approving a request that needs IT/AV", () => {
    assert.equal(shouldNotifyItOnApprove({ itNeeds: true }, "approved"), true);
    assert.equal(shouldNotifyItOnApprove({ itNeeds: false }, "approved"), false);
    assert.equal(shouldNotifyItOnApprove({ itNeeds: true }, "rejected"), false);
    assert.equal(shouldNotifyItOnApprove({ itNeeds: true }, "needs-changes"), false);
  });
});

describe("itNotificationDetails", () => {
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
});
