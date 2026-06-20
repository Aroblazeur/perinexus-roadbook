import test from "node:test";
import assert from "node:assert/strict";
import { createRoadbookStore, getRoadbookTotals, parseRoadbook, RoadbookDataError } from "../js/roadbook-store.js";

const minimalDay = { id: "one", title: "One" };
const payload = {
  schemaVersion: 1,
  roadbook: {
    id: "test",
    title: "Test",
    days: [
      { ...minimalDay, kilometers: 10, elevationGain: 100, elevationLoss: 80, durationMinutes: 65 },
      { id: "two", title: "Two", kilometers: 20, elevationGain: 250, elevationLoss: 200, durationMinutes: 120 }
    ]
  }
};

test("normalizes every Sprint 3 extension field", () => {
  const roadbook = parseRoadbook(payload);
  const day = roadbook.days[0];
  assert.equal(day.gpx, "");
  for (const field of ["photos", "interest", "restaurants", "shops", "water", "variants", "notes", "warning"]) {
    assert.deepEqual(day[field], [], field);
  }
  assert.deepEqual(day.route, { start: null, end: null, points: [] });
});

test("normalizes valid coordinates and rejects invalid coordinates", () => {
  const routePayload = structuredClone(payload);
  routePayload.roadbook.days[0].route = {
    start: { lat: 45.18, lng: 5.72 },
    end: { lat: 95, lng: 5.8 },
    points: [{ lat: 45.2, lng: 5.75 }, { lat: "invalid", lng: 5.8 }]
  };
  const route = parseRoadbook(routePayload).days[0].route;
  assert.deepEqual(route.start, { lat: 45.18, lng: 5.72 });
  assert.equal(route.end, null);
  assert.deepEqual(route.points, [{ lat: 45.2, lng: 5.75 }]);
});

test("accepts missing optional display fields without throwing", () => {
  const day = parseRoadbook({ schemaVersion: 1, roadbook: { id: "test", title: "Test", days: [minimalDay] } }).days[0];
  assert.equal(day.date, "");
  assert.equal(day.kilometers, null);
  assert.equal(day.accommodation, null);
  assert.equal(day.description, "");
});

test("rejects an unsupported schema and duplicate identifiers", () => {
  assert.throws(() => parseRoadbook({ schemaVersion: 2 }), RoadbookDataError);
  const duplicate = structuredClone(payload);
  duplicate.roadbook.days[1].id = "one";
  assert.throws(() => parseRoadbook(duplicate), /Duplicate day id/);
});

test("computes roadbook totals", () => {
  assert.deepEqual(getRoadbookTotals(parseRoadbook(payload)), {
    kilometers: 30,
    elevationGain: 350,
    elevationLoss: 280,
    durationMinutes: 185
  });
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
