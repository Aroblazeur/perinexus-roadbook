import test from "node:test";
import assert from "node:assert/strict";
import { createRoadbookMap } from "../js/map/map-adapter.js";
import { parseRoadbook } from "../js/roadbook-store.js";

const element = () => ({ hidden: false, textContent: "", setAttribute() {} });

function leafletMock() {
  const records = { markers: [], polylines: [], fitBounds: [], setView: [] };
  const map = {
    fitBounds(bounds, options) { records.fitBounds.push({ bounds, options }); },
    setView(coordinate, zoom) { records.setView.push({ coordinate, zoom }); },
    invalidateSize() {},
    remove() {}
  };
  const group = { clearLayers() {}, addTo() { return group; } };
  const layer = (kind, payload) => ({
    bindTooltip(label) { this.label = label; return this; },
    addTo() { records[kind].push({ ...payload, label: this.label }); return this; }
  });
  return {
    records,
    api: {
      map: () => map,
      tileLayer: () => ({ addTo() {} }),
      layerGroup: () => group,
      marker: (coordinate, options) => layer("markers", { coordinate, options }),
      polyline: (coordinates, options) => layer("polylines", { coordinates, options }),
      latLngBounds: (coordinates) => ({ coordinates })
    }
  };
}

const roadbook = parseRoadbook({
  schemaVersion: 1,
  roadbook: {
    id: "map",
    title: "Map",
    days: [
      {
        id: "mapped",
        title: "Mapped",
        departure: "A",
        arrival: "B",
        route: { start: { lat: 45.1, lng: 5.7 }, end: { lat: 45.2, lng: 5.8 }, points: [] }
      },
      { id: "unmapped", title: "Unmapped" }
    ]
  }
});

test("renders markers and a line from normalized store data", () => {
  const leaflet = leafletMock();
  const container = element();
  const fallback = element();
  const status = element();
  const map = createRoadbookMap({ container, fallback, status, leaflet: leaflet.api });
  assert.equal(map.renderRoadbook(roadbook), true);
  assert.equal(leaflet.records.markers.length, 2);
  assert.equal(leaflet.records.polylines.length, 1);
  assert.equal(container.hidden, false);
  assert.equal(fallback.hidden, true);
  assert.equal(map.focusDay(roadbook.days[0]), true);
  assert.match(status.textContent, /Mapped/);
});

test("ignores a day without coordinates", () => {
  const leaflet = leafletMock();
  const map = createRoadbookMap({ container: element(), fallback: element(), leaflet: leaflet.api });
  map.renderRoadbook(roadbook);
  assert.equal(map.focusDay(roadbook.days[1]), false);
});

test("provides an accessible fallback when no route is mapped", () => {
  const leaflet = leafletMock();
  const container = element();
  const fallback = element();
  const map = createRoadbookMap({ container, fallback, leaflet: leaflet.api });
  assert.equal(map.renderRoadbook({ days: [roadbook.days[1]] }), false);
  assert.equal(container.hidden, true);
  assert.equal(fallback.hidden, false);
  assert.match(fallback.textContent, /Aucune coordonnée/);
});

test("does not crash when Leaflet is unavailable", () => {
  const container = element();
  const fallback = element();
  const map = createRoadbookMap({ container, fallback, leaflet: undefined });
  assert.equal(map.available, false);
  assert.equal(map.renderRoadbook(roadbook), false);
  assert.equal(map.focusDay(roadbook.days[0]), false);
  assert.equal(container.hidden, true);
  assert.match(fallback.textContent, /pas disponible/);
});
