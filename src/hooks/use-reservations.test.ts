import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { QueryClient } from "@tanstack/react-query";
import { InMemoryReservationRepository } from "@/data/in-memory-reservation-repository";
import { MOCK_REQUESTS } from "@/lib/mock-requests";
import { RESERVATIONS_REFRESH_INTERVAL_MS, reservationListQueryOptions } from "./use-reservations";

describe("reservationListQueryOptions", () => {
  const options = reservationListQueryOptions(new InMemoryReservationRepository(MOCK_REQUESTS));

  it("refetches every 30 seconds while the page is visible", () => {
    assert.equal(RESERVATIONS_REFRESH_INTERVAL_MS, 30_000);
    assert.equal(options.refetchInterval, RESERVATIONS_REFRESH_INTERVAL_MS);
    assert.equal(options.refetchIntervalInBackground, false);
  });

  it("refetches when the tab regains focus", () => {
    assert.equal(options.refetchOnWindowFocus, true);
  });

  it("reads the latest list from the repository on every fetch", async () => {
    const repository = new InMemoryReservationRepository(MOCK_REQUESTS);
    const client = new QueryClient();
    const listOptions = reservationListQueryOptions(repository);

    const before = await client.fetchQuery(listOptions);
    const pending = before.find((request) => request.status === "pending");
    assert.ok(pending);

    await repository.review(pending.id, { decision: "approved", feedback: "" });
    await client.invalidateQueries({ queryKey: listOptions.queryKey });
    const after = await client.fetchQuery(listOptions);

    assert.equal(after.find((request) => request.id === pending.id)?.status, "approved");
  });
});
