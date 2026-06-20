import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { parseRoadbook } from "../js/roadbook-store.js";

const requiredFutureFields = [
  "gpx", "route", "photos", "interest", "restaurants", "shops", "water", "variants", "notes", "warning"
];
const requiredCardFields = [
  "title", "date", "departure", "arrival", "kilometers", "elevationGain", "elevationLoss",
  "difficulty", "accommodation", "description"
];

const [html, json] = await Promise.all([
  readFile(new URL("../index.html", import.meta.url), "utf8"),
  readFile(new URL("../data/roadbook.json", import.meta.url), "utf8")
]);
const payload = JSON.parse(json);
const roadbook = parseRoadbook(payload);

for (const day of payload.roadbook.days) {
  for (const field of [...requiredFutureFields, ...requiredCardFields]) {
    assert.ok(Object.hasOwn(day, field), `${day.id} is missing ${field}`);
  }
  assert.ok(Object.hasOwn(day.route, "start"), `${day.id} route is missing start`);
  assert.ok(Object.hasOwn(day.route, "end"), `${day.id} route is missing end`);
  assert.ok(Array.isArray(day.route.points), `${day.id} route points must be an array`);
  assert.equal(html.includes(day.title), false, `${day.id} is hard-coded in index.html`);
}

assert.equal(roadbook.days.length, payload.roadbook.days.length);
process.stdout.write(`Validated ${roadbook.days.length} data-driven stages and the generic HTML shell.\n`);
