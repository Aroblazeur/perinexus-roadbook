import test from "node:test";
import assert from "node:assert/strict";
import { getUserErrorMessage } from "../js/app.js";
import { RoadbookLoadError } from "../js/data-loader.js";
import { RoadbookDataError } from "../js/roadbook-store.js";

test("maps technical failures to explicit user messages", () => {
  assert.match(getUserErrorMessage(new RoadbookDataError("bad schema")), /format attendu/);
  assert.match(getUserErrorMessage(new RoadbookLoadError("invalid-json", "bad json")), /JSON invalide/);
  assert.match(getUserErrorMessage(new RoadbookLoadError("http", "404")), /serveur/);
  assert.match(getUserErrorMessage(new RoadbookLoadError("network", "offline")), /connexion/);
});
