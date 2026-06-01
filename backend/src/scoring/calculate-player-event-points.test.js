import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calculatePlayerEventPoints } from "./calculate-player-event-points.js";

describe("calculatePlayerEventPoints", () => {
  it("scores a goal", () => {
    assert.equal(calculatePlayerEventPoints({ eventType: "goal" }), 5);
  });

  it("scores an assist", () => {
    assert.equal(calculatePlayerEventPoints({ eventType: "assist" }), 3);
  });

  it("scores a yellow card", () => {
    assert.equal(calculatePlayerEventPoints({ eventType: "yellow_card" }), -1);
  });
});

