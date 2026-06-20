import test from "node:test";
import assert from "node:assert/strict";
import { loadRoadbook, RoadbookLoadError } from "../js/data-loader.js";
import { RoadbookDataError } from "../js/roadbook-store.js";

const validPayload = JSON.stringify({
  schemaVersion: 1,
  roadbook: { id: "test", title: "Test", days: [{ id: "day", title: "Day" }] }
});

const response = (body, { ok = true, status = 200 } = {}) => ({ ok, status, text: async () => body });

test("loads and parses a valid roadbook", async () => {
  const roadbook = await loadRoadbook("roadbook.json", { fetchImpl: async () => response(validPayload) });
  assert.equal(roadbook.days[0].id, "day");
});

test("reports network failures", async () => {
  await assert.rejects(
    loadRoadbook("roadbook.json", { fetchImpl: async () => { throw new Error("offline"); } }),
    (error) => error instanceof RoadbookLoadError && error.code === "network"
  );
});

test("reports HTTP failures", async () => {
  await assert.rejects(
    loadRoadbook("roadbook.json", { fetchImpl: async () => response("", { ok: false, status: 404 }) }),
    (error) => error instanceof RoadbookLoadError && error.code === "http"
  );
});

test("reports invalid JSON", async () => {
  await assert.rejects(
    loadRoadbook("roadbook.json", { fetchImpl: async () => response("not json") }),
    (error) => error instanceof RoadbookLoadError && error.code === "invalid-json"
  );
});

test("reports an invalid roadbook structure", async () => {
  await assert.rejects(
    loadRoadbook("roadbook.json", { fetchImpl: async () => response("{}") }),
    RoadbookDataError
  );
});
