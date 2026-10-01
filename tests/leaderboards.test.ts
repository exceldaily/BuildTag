/**
 * Leaderboard URL handling and rank movement (the ranking itself is SQL,
 * tested against the database in migration 0022's rollout).
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { BOARDS, boardHref, movement, parseBoard, parsePeriod, position } from "../src/lib/leaderboards";

describe("leaderboards", () => {
  it("has the five public boards", () => {
    assert.deepEqual(
      BOARDS.map((b) => b.id),
      ["scanned", "liked", "trending", "top", "crews"],
    );
  });

  it("falls back to most scanned, all time, for unknown input", () => {
    assert.equal(parseBoard(undefined).id, "scanned");
    assert.equal(parseBoard("nope").id, "scanned");
    assert.equal(parseBoard(["liked", "top"]).id, "liked");
    assert.equal(parsePeriod("yesterday", parseBoard("scanned")), "all");
    assert.equal(parsePeriod("month", parseBoard("top")), "month");
  });

  it("locks trending to the last 7 days", () => {
    assert.equal(parsePeriod("month", parseBoard("trending")), "week");
    assert.equal(boardHref("trending", "month"), "/leaderboards?board=trending");
  });

  it("keeps defaults out of the URL", () => {
    assert.equal(boardHref("scanned", "all"), "/leaderboards");
    assert.equal(boardHref("scanned", "week"), "/leaderboards?period=week");
    assert.equal(boardHref("crews", "month"), "/leaderboards?board=crews&period=month");
  });

  it("reports movement against the previous window", () => {
    assert.deepEqual(movement({ rank: 2, prev_rank: 5, is_new: false }), { kind: "up", by: 3 });
    assert.deepEqual(movement({ rank: 4, prev_rank: 3, is_new: false }), { kind: "down", by: 1 });
    assert.deepEqual(movement({ rank: 1, prev_rank: 1, is_new: false }), { kind: "same" });
    assert.deepEqual(movement({ rank: 6, prev_rank: null, is_new: true }), { kind: "new" });
    assert.deepEqual(movement({ rank: 6, prev_rank: null, is_new: false }), { kind: "new" });
  });

  it("pads positions like a timing board", () => {
    assert.equal(position(1), "01");
    assert.equal(position(12), "12");
  });
});
