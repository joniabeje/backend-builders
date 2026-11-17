import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "vitest";
import assert from "node:assert/strict";

const SPEC = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "openapi.yaml"), "utf8");

describe("docs/openapi.yaml", () => {
  it("documents every implemented /api route and the required error codes", () => {
    assert.match(SPEC, /^openapi:\s*3\.1\.0/m);
    for (const path of ["/api/rooms", "/api/reservations", "/api/reservations/{id}"]) {
      assert.match(SPEC, new RegExp(`^ {2}${path.replaceAll("/", "\\/")}:`, "m"), path);
    }
    for (const method of ["get:", "post:", "patch:"]) {
      assert.match(SPEC, new RegExp(`^ {4}${method}`, "m"), method);
    }
    for (const code of ['"400"', '"403"', '"404"', '"409"']) {
      assert.match(SPEC, new RegExp(code));
    }
    assert.match(SPEC, /\$ref: "#\/components\/schemas\/NewReservation"/);
    assert.match(SPEC, /\$ref: "#\/components\/schemas\/Reservation"/);
    assert.match(SPEC, /\$ref: "#\/components\/schemas\/ReviewInput"/);
    assert.match(SPEC, /\$ref: "#\/components\/schemas\/Room"/);
  });
});
