import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { ApiReservationRepository } from "./api-reservation-repository";
import {
  createReservationRepository,
  isUsingMockReservations,
} from "./create-reservation-repository";
import { InMemoryReservationRepository } from "./in-memory-reservation-repository";

describe("createReservationRepository", () => {
  it("returns the API repository by default", () => {
    assert.equal(isUsingMockReservations({}), false);
    assert.ok(createReservationRepository({}) instanceof ApiReservationRepository);
  });

  it("returns the in-memory repository when VITE_USE_MOCKS=true", () => {
    assert.equal(isUsingMockReservations({ VITE_USE_MOCKS: "true" }), true);
    assert.ok(
      createReservationRepository({ VITE_USE_MOCKS: "true" }) instanceof
        InMemoryReservationRepository,
    );
  });
});
