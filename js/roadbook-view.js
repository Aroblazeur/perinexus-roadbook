import { createDayCard } from "./card-factory.js";
import { getRoadbookTotals } from "./roadbook-store.js";
import { createElement } from "./utils.js";

const REQUIRED_ELEMENT_IDS = [
  "app", "brand-eyebrow", "brand-title", "brand-tagline", "roadbook-info", "trip-stats",
  "stage-count", "stage-list", "day-navigation", "previous-day", "next-day", "current-day",
  "progress-bar", "day-card-host", "app-error", "footer-title", "footer-message"
];

export function createRoadbookView() {
  const elements = Object.fromEntries(REQUIRED_ELEMENT_IDS.map((id) => [id, document.getElementById(id)]));
  const missing = REQUIRED_ELEMENT_IDS.filter((id) => !elements[id]);
  if (missing.length) throw new Error(`Missing application elements: ${missing.join(", ")}`);

  let store;

  function initialize(roadbookStore) {
    store = roadbookStore;
    const { roadbook } = store.getState();
    renderRoadbookHeader(roadbook);
    renderStageList(roadbook.days);
    renderState(store.getState());
    store.subscribe((state) => renderState(state, { focus: true }));
    elements["previous-day"].addEventListener("click", store.previous);
    elements["next-day"].addEventListener("click", store.next);
    document.addEventListener("keydown", handleKeyboardNavigation);
    elements.app.setAttribute("aria-busy", "false");
  }

  function handleKeyboardNavigation(event) {
    if (event.key === "ArrowLeft") store.previous();
    if (event.key === "ArrowRight") store.next();
  }

  function renderRoadbookHeader(roadbook) {
    const branding = roadbook.branding;
    const totals = getRoadbookTotals(roadbook);
    document.documentElement.lang = roadbook.locale.split("-")[0];
    elements["brand-eyebrow"].textContent = branding.eyebrow || "Roadbook";
    elements["brand-title"].textContent = branding.title || roadbook.title;
    elements["brand-tagline"].textContent = branding.tagline || roadbook.description;
    elements["footer-title"].textContent = branding.footerTitle || roadbook.title;
    elements["footer-message"].textContent = branding.footerMessage || "";
    elements["roadbook-info"].replaceChildren(
      createElement("p", { className: "eyebrow", text: "Votre aventure" }),
      createElement("h2", { text: roadbook.title, attributes: { id: "roadbook-title" } }),
      createElement("p", { text: roadbook.description })
    );
    renderTotals(roadbook, totals);
    elements["stage-count"].textContent = `${roadbook.days.length} étapes`;
  }

  function renderTotals(roadbook, totals) {
    const entries = [
      [roadbook.days.length, "étapes"],
      [totals.kilometers, "kilomètres"],
      [totals.elevationGain.toLocaleString(roadbook.locale), "mètres D+"]
    ];
    elements["trip-stats"].replaceChildren(...entries.map(([value, label]) => {
      const item = createElement("div", { className: "summary__stat" });
      item.append(createElement("dd", { text: String(value) }), createElement("dt", { text: label }));
      return item;
    }));
    elements["trip-stats"].hidden = false;
  }

  function renderStageList(days) {
    elements["stage-list"].replaceChildren(...days.map((day, index) => {
      const item = createElement("li");
      const button = createElement("button", { attributes: { type: "button", "data-day-id": day.id } });
      button.append(
        createElement("span", { className: "stage-list__number", text: String(index + 1).padStart(2, "0") }),
        createElement("span", { className: "stage-list__title", text: day.title }),
        createElement("span", { className: "stage-list__distance", text: day.kilometers === null ? "--" : `${day.kilometers} km` })
      );
      button.addEventListener("click", () => store.select(day.id));
      item.append(button);
      return item;
    }));
  }

  function renderState(state, { focus = false } = {}) {
    const { roadbook, currentDay, currentIndex } = state;
    elements["current-day"].textContent = `Jour ${currentIndex + 1} sur ${roadbook.days.length}`;
    elements["progress-bar"].style.width = `${((currentIndex + 1) / roadbook.days.length) * 100}%`;
    elements["previous-day"].disabled = !state.hasPrevious;
    elements["next-day"].disabled = !state.hasNext;
    updateActiveStage(currentDay.id);

    const card = createDayCard(currentDay, currentIndex);
    elements["day-card-host"].replaceChildren(card);
    document.title = `${currentDay.title} - ${roadbook.title}`;
    if (focus) card.focus({ preventScroll: true });
  }

  function updateActiveStage(dayId) {
    elements["stage-list"].querySelectorAll("button").forEach((button) => {
      const active = button.dataset.dayId === dayId;
      button.classList.toggle("is-active", active);
      if (active) button.setAttribute("aria-current", "step"); else button.removeAttribute("aria-current");
    });
  }

  function renderError(message) {
    elements["roadbook-info"].replaceChildren(
      createElement("h2", { text: "Roadbook indisponible", attributes: { id: "roadbook-title" } }),
      createElement("p", { text: message })
    );
    elements["stage-list"].replaceChildren();
    elements["day-card-host"].replaceChildren();
    elements["day-navigation"].hidden = true;
    elements["app-error"].hidden = false;
    elements["app-error"].textContent = message;
    elements.app.setAttribute("aria-busy", "false");
  }

  return Object.freeze({ initialize, renderError });
}
