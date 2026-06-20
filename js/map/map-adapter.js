const TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const DEFAULT_FALLBACK = "La carte interactive n’est pas disponible. Le roadbook reste consultable ci-dessous.";

export function createRoadbookMap({ container, fallback, status, leaflet = globalThis.L } = {}) {
  if (!container || !fallback) throw new Error("Map container and fallback are required");
  if (!isLeafletAvailable(leaflet)) return createUnavailableAdapter(container, fallback, DEFAULT_FALLBACK);

  try {
    const adapter = createLeafletAdapter({ container, fallback, status, leaflet });
    return createSafeAdapter(adapter, container, fallback);
  } catch (error) {
    console.error("Map initialization failed", error);
    return createUnavailableAdapter(container, fallback, DEFAULT_FALLBACK);
  }
}

function createSafeAdapter(adapter, container, fallback) {
  const safeCall = (method, failureValue, ...args) => {
    try {
      return adapter[method](...args);
    } catch (error) {
      console.error(`Map ${method} failed`, error);
      showFallback(container, fallback, DEFAULT_FALLBACK);
      return failureValue;
    }
  };
  return Object.freeze({
    available: true,
    renderRoadbook: (roadbook) => safeCall("renderRoadbook", false, roadbook),
    focusDay: (day, options) => safeCall("focusDay", false, day, options),
    destroy: () => safeCall("destroy", undefined)
  });
}

function createLeafletAdapter({ container, fallback, status, leaflet }) {
  const map = leaflet.map(container, { scrollWheelZoom: false });
  leaflet.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, maxZoom: 19 }).addTo(map);
  const layers = leaflet.layerGroup().addTo(map);
  const coordinatesByDay = new Map();

  function renderRoadbook(roadbook) {
    layers.clearLayers();
    coordinatesByDay.clear();
    const allCoordinates = [];

    roadbook.days.forEach((day) => {
      const coordinates = dayCoordinates(day);
      if (!coordinates.length) return;
      coordinatesByDay.set(day.id, coordinates);
      allCoordinates.push(...coordinates);

      if (day.route.start) addMarker(day, day.route.start, "Départ");
      if (day.route.end) addMarker(day, day.route.end, "Arrivée");
      if (day.route.start && day.route.end) {
        leaflet.polyline([toLatLng(day.route.start), toLatLng(day.route.end)], {
          color: "#e87534",
          weight: 4,
          opacity: 0.85,
          dashArray: "8 7"
        }).addTo(layers);
      }
    });

    if (!allCoordinates.length) {
      showFallback(container, fallback, "Aucune coordonnée valide n’est disponible pour ce roadbook.");
      return false;
    }

    showMap(container, fallback);
    fitCoordinates(allCoordinates);
    map.invalidateSize();
    return true;
  }

  function addMarker(day, coordinate, kind) {
    const place = kind === "Départ" ? day.departure : day.arrival;
    const label = `${kind} — ${day.title}${place ? ` : ${place}` : ""}`;
    leaflet.marker(toLatLng(coordinate), { title: label, alt: label, riseOnHover: true })
      .bindTooltip(label)
      .addTo(layers);
  }

  function focusDay(day, { announce = true } = {}) {
    const coordinates = coordinatesByDay.get(day.id) || dayCoordinates(day);
    if (!coordinates.length) return false;
    showMap(container, fallback);
    fitCoordinates(coordinates);
    if (announce && status) status.textContent = `Carte centrée sur l’étape ${day.title}.`;
    return true;
  }

  function fitCoordinates(coordinates) {
    if (coordinates.length === 1) {
      map.setView(toLatLng(coordinates[0]), 13);
      return;
    }
    map.fitBounds(leaflet.latLngBounds(coordinates.map(toLatLng)), { padding: [24, 24], maxZoom: 13 });
  }

  return Object.freeze({
    available: true,
    renderRoadbook,
    focusDay,
    destroy: () => map.remove()
  });
}

function createUnavailableAdapter(container, fallback, message) {
  showFallback(container, fallback, message);
  return Object.freeze({
    available: false,
    renderRoadbook: () => false,
    focusDay: () => false,
    destroy: () => {}
  });
}

function isLeafletAvailable(leaflet) {
  return leaflet && ["map", "tileLayer", "layerGroup", "marker", "polyline", "latLngBounds"]
    .every((method) => typeof leaflet[method] === "function");
}

function dayCoordinates(day) {
  return [day.route?.start, day.route?.end].filter(Boolean);
}

function toLatLng(coordinate) {
  return [coordinate.lat, coordinate.lng];
}

function showFallback(container, fallback, message) {
  container.hidden = true;
  fallback.hidden = false;
  fallback.textContent = message;
}

function showMap(container, fallback) {
  container.hidden = false;
  fallback.hidden = true;
  fallback.textContent = "";
}
