export const EMPTY_VALUE = "Non renseigné";

export function asArray(value) {
  return Array.isArray(value) ? value : [];
}

export function asText(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

export function asNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

export function displayValue(value, fallback = EMPTY_VALUE) {
  return value === null || value === undefined || value === "" ? fallback : String(value);
}

export function formatDuration(minutes) {
  if (!Number.isFinite(minutes)) return EMPTY_VALUE;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours} h ${String(remainder).padStart(2, "0")}` : `${hours} h`;
}

export function createElement(tag, { className, text, attributes } = {}) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  Object.entries(attributes || {}).forEach(([name, value]) => element.setAttribute(name, value));
  return element;
}
