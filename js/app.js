import { loadRoadbook, RoadbookLoadError } from "./data-loader.js";
import { RoadbookDataError } from "./roadbook-store.js";
import { createRoadbookView } from "./roadbook-view.js";

const DATA_URL = "data/roadbook.json";

export function getUserErrorMessage(error) {
  if (error instanceof RoadbookDataError || error?.code === "invalid-data") {
    return "Le fichier du roadbook ne respecte pas le format attendu.";
  }
  if (error instanceof RoadbookLoadError && error.code === "invalid-json") {
    return "Le fichier du roadbook contient un JSON invalide.";
  }
  if (error instanceof RoadbookLoadError && error.code === "http") {
    return "Le roadbook est momentanément indisponible sur le serveur.";
  }
  return "Les données n'ont pas pu être chargées. Vérifiez votre connexion puis rechargez la page.";
}

export async function bootstrap({ dataUrl = DATA_URL } = {}) {
  let view;
  try {
    view = createRoadbookView();
    const roadbook = await loadRoadbook(dataUrl);
    view.initialize(roadbook);
  } catch (error) {
    console.error("Roadbook initialization failed", error);
    const message = getUserErrorMessage(error);
    if (view) view.renderError(message);
    else renderFallbackError(message);
  }
}

function renderFallbackError(message) {
  const fallback = document.createElement("main");
  fallback.className = "container card error-card";
  fallback.setAttribute("role", "alert");
  fallback.textContent = message;
  document.body.append(fallback);
}

if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", () => bootstrap());
}
