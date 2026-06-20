import { parseRoadbook, RoadbookDataError } from "./roadbook-store.js";

export class RoadbookLoadError extends Error {
  constructor(code, message, options) {
    super(message, options);
    this.name = "RoadbookLoadError";
    this.code = code;
  }
}

export async function loadRoadbook(url, { fetchImpl = globalThis.fetch } = {}) {
  if (typeof fetchImpl !== "function") {
    throw new RoadbookLoadError("network", "Fetch is unavailable");
  }

  let response;
  try {
    response = await fetchImpl(url, { headers: { Accept: "application/json" } });
  } catch (error) {
    throw new RoadbookLoadError("network", "Roadbook request failed", { cause: error });
  }

  if (!response.ok) {
    throw new RoadbookLoadError("http", `Roadbook request returned HTTP ${response.status}`);
  }

  let payload;
  try {
    payload = JSON.parse(await response.text());
  } catch (error) {
    throw new RoadbookLoadError("invalid-json", "Roadbook response is not valid JSON", { cause: error });
  }

  try {
    return parseRoadbook(payload);
  } catch (error) {
    if (error instanceof RoadbookDataError) throw error;
    throw new RoadbookLoadError("invalid-data", "Roadbook data is invalid", { cause: error });
  }
}
