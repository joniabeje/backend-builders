import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { BookedSlot } from "./room-availability.ts";
import {
  recommendRooms,
  type RecommendableRoom,
  type RecommendationRequest,
} from "./room-recommendation.ts";

const ROOMS: RecommendableRoom[] = [
  { id: "aud", name: "Auditorium", capacity: 250, features: ["Projector", "Stage"] },
  { id: "conf", name: "Conference Room", capacity: 40, features: ["Projector", "Whiteboard"] },
  { id: "lab", name: "Innovation Lab", capacity: 30, features: ["Projector", "3D Printers"] },
  { id: "mp", name: "Multipurpose Room", capacity: 80, features: ["Projector"] },
  { id: "seminar", name: "Seminar Room", capacity: 25, features: ["Whiteboard"] },
  { id: "atrium", name: "Atrium", capacity: 150, features: ["Reception"] },
];

const request = (overrides: Partial<RecommendationRequest> = {}): RecommendationRequest => ({
  attendance: 25,
  date: "2026-05-02",
  startTime: "14:00",
  endTime: "16:00",
  requiredFeatures: [],
  preferredRoomId: "",
  ...overrides,
});

const booked = (room: string, overrides: Partial<BookedSlot> = {}): BookedSlot => ({
  id: `REQ-${room}`,
  room,
  date: "2026-05-02",
  startTime: "14:00",
  endTime: "16:00",
  status: "approved",
  ...overrides,
});

const ids = (req: RecommendationRequest, reservations: BookedSlot[] = []) =>
  recommendRooms(req, ROOMS, reservations).rooms.map((room) => room.id);

describe("recommendRooms ranking", () => {
  it("ranks the smallest room that fits first and returns at most three", () => {
    assert.deepEqual(ids(request({ attendance: 25 })), ["seminar", "lab", "conf"]);
  });

  it("never recommends a room smaller than the attendance", () => {
    assert.deepEqual(ids(request({ attendance: 31 })), ["conf", "mp"]);
  });

  it("leaves out rooms more than three times the attendance while smaller ones fit", () => {
    assert.deepEqual(ids(request({ attendance: 60 })), ["mp", "atrium"]);
  });

  it("falls back to oversized rooms when nothing within three times fits", () => {
    // 5 attendees: the 25-seat seminar room is 5x, but it is still the best fit.
    assert.deepEqual(ids(request({ attendance: 5 })), ["seminar", "lab", "conf"]);
  });

  it("returns nothing for unusable attendance", () => {
    for (const attendance of [0, -3, Number.NaN, Infinity, 5001]) {
      assert.deepEqual(ids(request({ attendance })), [], String(attendance));
    }
    assert.deepEqual(ids(request({ attendance: 300 })), []);
  });
});

describe("recommendRooms availability filter", () => {
  it("never includes a room with a conflicting booking", () => {
    // The 80-seat room is over 3x the attendance, so it stays out while smaller rooms fit.
    assert.deepEqual(ids(request(), [booked("seminar")]), ["lab", "conf"]);
  });

  it("keeps a room whose booking only touches the requested slot", () => {
    const earlier = booked("seminar", { startTime: "12:00", endTime: "14:00" });
    assert.deepEqual(ids(request(), [earlier]), ["seminar", "lab", "conf"]);
  });

  it("ignores rejected bookings", () => {
    assert.deepEqual(ids(request(), [booked("seminar", { status: "rejected" })]), [
      "seminar",
      "lab",
      "conf",
    ]);
  });

  it("does not filter by bookings until the slot is complete", () => {
    const result = recommendRooms(request({ startTime: "" }), ROOMS, [booked("seminar")]);
    assert.equal(result.availabilityChecked, false);
    assert.deepEqual(
      result.rooms.map((room) => room.id),
      ["seminar", "lab", "conf"],
    );
  });
});

describe("recommendRooms feature filter", () => {
  it("excludes rooms missing a required feature", () => {
    assert.deepEqual(ids(request({ requiredFeatures: ["Projector"] })), ["lab", "conf"]);
  });

  it("requires every listed feature", () => {
    assert.deepEqual(ids(request({ requiredFeatures: ["Projector", "Whiteboard"] })), ["conf"]);
  });

  it("returns nothing when no room has the feature", () => {
    assert.deepEqual(ids(request({ requiredFeatures: ["Pool"] })), []);
  });
});

describe("recommendRooms preferred room", () => {
  it("reports nothing when the preferred room is suitable", () => {
    const result = recommendRooms(request({ preferredRoomId: "seminar" }), ROOMS, []);
    assert.equal(result.preferred, null);
  });

  it("flags a booked preferred room and offers alternatives without it", () => {
    const result = recommendRooms(request({ preferredRoomId: "seminar" }), ROOMS, [
      booked("seminar"),
    ]);
    assert.equal(result.preferred?.room.id, "seminar");
    assert.deepEqual(result.preferred?.reasons, ["booked"]);
    assert.deepEqual(
      result.preferred?.conflicts.map((conflict) => conflict.id),
      ["REQ-seminar"],
    );
    assert.deepEqual(
      result.rooms.map((room) => room.id),
      ["lab", "conf"],
    );
  });

  it("collects every reason the preferred room does not work", () => {
    const result = recommendRooms(
      request({ attendance: 30, preferredRoomId: "seminar", requiredFeatures: ["Projector"] }),
      ROOMS,
      [booked("seminar")],
    );
    assert.deepEqual(result.preferred?.reasons, ["booked", "too-small", "missing-features"]);
    assert.deepEqual(result.preferred?.missingFeatures, ["Projector"]);
  });

  it("still flags a booked preferred room before attendance is entered", () => {
    const result = recommendRooms(request({ attendance: 0, preferredRoomId: "seminar" }), ROOMS, [
      booked("seminar"),
    ]);
    assert.deepEqual(result.preferred?.reasons, ["booked"]);
    assert.deepEqual(result.rooms, []);
  });

  it("ignores an unknown preferred room id", () => {
    assert.equal(recommendRooms(request({ preferredRoomId: "nope" }), ROOMS, []).preferred, null);
  });
});
