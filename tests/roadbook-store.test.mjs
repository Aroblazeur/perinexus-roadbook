import test from "node:test";
import assert from "node:assert/strict";
import { createRoadbookStore, formatDuration, getRoadbookTotals, parseRoadbook, RoadbookDataError } from "../js/roadbook-store.js";

const payload = {
  schemaVersion: 1,
  roadbook: {
    id: "test", title: "Test", days: [
      { id: "one", title: "One", distanceKm: 10, elevationGainM: 100, durationMinutes: 65, summary: "First" },
      { id: "two", title: "Two", distanceKm: 20, elevationGainM: 250, durationMinutes: 120, summary: "Second" }
    ]
  }
};

test("parses and normalizes a valid roadbook", () => {
  const roadbook = parseRoadbook(payload);
  assert.equal(roadbook.days.length, 2);
  assert.deepEqual(roadbook.days[0].photos, []);
});

test("rejects invalid and duplicate days", () => {
  assert.throws(() => parseRoadbook({ schemaVersion: 2 }), RoadbookDataError);
  const duplicate = structuredClone(payload);
  duplicate.roadbook.days[1].id = "one";
  assert.throws(() => parseRoadbook(duplicate), /Duplicate day id/);
});

test("computes totals and durations", () => {
  const roadbook = parseRoadbook(payload);
  assert.deepEqual(getRoadbookTotals(roadbook), { distanceKm: 30, elevationGainM: 350, durationMinutes: 185 });
  assert.equal(formatDuration(65), "1 h 05");
  assert.equal(formatDuration(120), "2 h");
});

test("selects days without leaving valid bounds", () => {
  const store = createRoadbookStore(parseRoadbook(payload));
  assert.equal(store.getState().currentDay.id, "one");
  assert.equal(store.previous(), false);
  assert.equal(store.next(), true);
  assert.equal(store.getState().currentDay.id, "two");
  assert.equal(store.next(), false);
  assert.equal(store.select("one"), true);
});

