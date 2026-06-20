"use strict";

const ETAPES_URL =
    "https://docs.google.com/spreadsheets/d/1jhlhFPZF-oeAaiJ0pLKKagNMMa-SBxJ9HgnB4SMnyPU/gviz/tq?tqx=out:csv&sheet=etapes%20principales";

const VARIANTES_URL =
    "https://docs.google.com/spreadsheets/d/1jhlhFPZF-oeAaiJ0pLKKagNMMa-SBxJ9HgnB4SMnyPU/gviz/tq?tqx=out:csv&sheet=Variante%20et%20option";

const FALLBACK_PATHS = ["data/roadbook.json", "roadbook.json"];

const ERROR_MESSAGES = {
    NETWORK: "erreur réseau",
    INVALID_CSV: "CSV invalide",
    INVALID_SCHEMA: "schéma invalide"
};

const REQUIRED_ETAPES_HEADERS = [
    "etape",
    "jour",
    "depart",
    "arrivee",
    "distance (km)"
];

const REQUIRED_VARIANTES_HEADERS = [
    "etape principale associe",
    "nom variante"
];

function normalizeHeader(value) {
    return String(value || "")
        .trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ")
        .toLowerCase();
}

function normalizeValue(value) {
    const trimmed = String(value ?? "").trim();
    return trimmed === "" ? null : trimmed;
}

function toNumber(value) {
    const normalized = normalizeValue(value);
    if (normalized === null) return null;
    const candidate = normalized.replace(/\s/g, "").replace(",", ".");
    const parsed = Number(candidate);
    return Number.isFinite(parsed) ? parsed : null;
}

function toBoolean(value) {
    const normalized = normalizeHeader(value);
    if (!normalized) return false;
    return ["1", "true", "vrai", "oui", "active", "activee", "activé", "activée", "x"].includes(normalized);
}

function splitMulti(value) {
    const normalized = normalizeValue(value);
    if (!normalized) return [];
    return normalized
        .split("---")
        .map(part => part.trim())
        .filter(Boolean);
}

function parseCsv(csvText) {
    const input = String(csvText ?? "").replace(/^\uFEFF/, "");
    const rows = [];
    let row = [];
    let cell = "";
    let inQuotes = false;

    for (let i = 0; i < input.length; i += 1) {
        const char = input[i];
        const next = input[i + 1];

        if (char === '"') {
            if (inQuotes && next === '"') {
                cell += '"';
                i += 1;
            } else {
                inQuotes = !inQuotes;
            }
            continue;
        }

        if (!inQuotes && char === ",") {
            row.push(cell);
            cell = "";
            continue;
        }

        if (!inQuotes && (char === "\n" || char === "\r")) {
            if (char === "\r" && next === "\n") i += 1;
            row.push(cell);
            if (row.some(value => String(value).trim() !== "")) {
                rows.push(row);
            }
            row = [];
            cell = "";
            continue;
        }

        cell += char;
    }

    if (inQuotes) {
        throw new Error(ERROR_MESSAGES.INVALID_CSV);
    }

    if (cell.length > 0 || row.length > 0) {
        row.push(cell);
        if (row.some(value => String(value).trim() !== "")) {
            rows.push(row);
        }
    }

    if (!rows.length) {
        throw new Error(ERROR_MESSAGES.INVALID_CSV);
    }

    const [headers, ...dataRows] = rows;
    const normalizedHeaders = headers.map(header => normalizeHeader(header));

    return dataRows.map(values => {
        const record = {};
        normalizedHeaders.forEach((header, index) => {
            record[header] = normalizeValue(values[index]);
        });
        return record;
    });
}

function ensureSchema(rows, requiredHeaders) {
    const sample = rows[0] || {};
    const missing = requiredHeaders.filter(header => !(header in sample));
    if (missing.length > 0) {
        throw new Error(ERROR_MESSAGES.INVALID_SCHEMA);
    }
}

function firstValue(record, candidates) {
    for (const key of candidates) {
        const value = record[normalizeHeader(key)];
        if (value !== undefined) return value;
    }
    return null;
}

function firstValueByPrefix(record, prefix) {
    const normalizedPrefix = normalizeHeader(prefix);
    const key = Object.keys(record).find(item => item.startsWith(normalizedPrefix));
    return key ? record[key] : null;
}

function buildAccommodation(record) {
    const alternativesValue =
        firstValue(record, ["hebergement alternatif", "hebergement alternative"]) ??
        firstValueByPrefix(record, "hebergement alte");

    return {
        name: firstValue(record, ["hebergement", "hébergement"]),
        url: firstValue(record, [
            "site web de l'hébergement",
            "site web de l hebergement",
            "site web de l'hebergement",
            "site web de l hébergement"
        ]),
        alternatives: splitMulti(alternativesValue),
        houseRentals: splitMulti(firstValue(record, ["possibilite de location maison", "possibilité de location maison"]))
    };
}

function mapEtape(record) {
    const stageNumber = toNumber(firstValue(record, ["etape", "étape"]));
    const dayNumber = toNumber(firstValue(record, ["jour"]));
    const departure = firstValue(record, ["depart", "départ"]);
    const arrival = firstValue(record, ["arrivee", "arrivée"]);
    const notes = firstValue(record, ["notes"]);
    const gpx = firstValue(record, ["gpx"]);
    const distance = toNumber(firstValue(record, ["distance (km)"]));
    const elevationGain = toNumber(firstValue(record, ["d+ (m)"]));
    const elevationLoss = toNumber(firstValue(record, ["d− (m)", "d- (m)"]));
    const accommodation = buildAccommodation(record);
    const routeLabel = [departure, arrival].filter(Boolean).join(" → ");

    return {
        stage: stageNumber,
        day: dayNumber,
        departure,
        arrival,
        distance,
        elevationGain,
        elevationLoss,
        notes,
        gpx,
        accommodation,
        variants: [],
        title: `Jour ${dayNumber ?? "?"}${routeLabel ? ` - ${routeLabel}` : ""}`,
        elevation: elevationGain ?? 0,
        duration: "",
        description: notes || "",
        pois: [],
        legacyAccommodation: accommodation.name || ""
    };
}

function mapVariante(record) {
    return {
        stageReference: firstValue(record, ["etape principale associe", "etape principale associé"]),
        day: toNumber(firstValue(record, ["jour"])),
        name: firstValue(record, ["nom variante"]),
        type: firstValue(record, ["type"]),
        distanceExtra: toNumber(firstValue(record, ["distance supplementaire (km)", "distance supplémentaire (km)"])),
        elevationGainExtra: toNumber(firstValue(record, ["d+ supplementaire (m)", "d+ supplémentaire (m)"])),
        elevationLossExtra: toNumber(firstValue(record, ["d− supplementaire (m)", "d− supplémentaire (m)", "d- supplementaire (m)", "d- supplémentaire (m)"])),
        pointOfInterest: firstValue(record, ["point d'intérêt", "point d'interet"]),
        description: firstValue(record, ["description / photos"]),
        link: firstValue(record, ["lien"]),
        gpx: firstValue(record, ["gpx"]),
        enabled: toBoolean(firstValue(record, ["activee", "activée"]))
    };
}

function stageMatchKey(stage) {
    const stageCandidates = [
        stage.stage !== null ? String(stage.stage) : null,
        stage.day !== null ? String(stage.day) : null,
        stage.departure ? `${stage.departure}` : null
    ].filter(Boolean);
    return stageCandidates.map(value => normalizeHeader(value));
}

function attachVariants(stages, variants) {
    const byKey = new Map();

    stages.forEach(stage => {
        stageMatchKey(stage).forEach(key => {
            if (!byKey.has(key)) byKey.set(key, stage);
        });
    });

    variants.forEach(variant => {
        const referenceKeys = [
            normalizeHeader(variant.stageReference),
            variant.day !== null ? normalizeHeader(String(variant.day)) : null
        ].filter(Boolean);

        let stage = null;
        for (const key of referenceKeys) {
            if (byKey.has(key)) {
                stage = byKey.get(key);
                break;
            }
        }

        if (!stage) return;
        stage.variants.push(variant);
        if (variant.pointOfInterest) {
            stage.pois.push(variant.pointOfInterest);
        }
    });
}

async function fetchCsv(url) {
    let response;
    try {
        response = await fetch(url);
    } catch (error) {
        throw new Error(ERROR_MESSAGES.NETWORK);
    }

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }

    return response.text();
}

async function loadGoogleSheetRoadbook() {
    const [etapesCsv, variantesCsv] = await Promise.all([
        fetchCsv(ETAPES_URL),
        fetchCsv(VARIANTES_URL)
    ]);

    const etapesRows = parseCsv(etapesCsv);
    const variantesRows = parseCsv(variantesCsv);

    ensureSchema(etapesRows, REQUIRED_ETAPES_HEADERS);
    ensureSchema(variantesRows, REQUIRED_VARIANTES_HEADERS);

    const stages = etapesRows.map(mapEtape);
    const variants = variantesRows.map(mapVariante);

    attachVariants(stages, variants);

    return {
        title: "Perinexus à vélo",
        description: "Roadbook d'itinérance à vélo.",
        stages,
        days: stages.map(stage => ({
            title: stage.title,
            distance: stage.distance ?? 0,
            elevation: stage.elevation ?? 0,
            duration: stage.duration,
            description: stage.description,
            accommodation: stage.legacyAccommodation,
            pois: stage.pois
        }))
    };
}

async function loadFallbackRoadbook() {
    async function loadNodeFallback(path) {
        const isNodeRuntime =
            typeof process !== "undefined" &&
            Boolean(process.versions && process.versions.node);

        if (!isNodeRuntime || typeof require !== "function") {
            return null;
        }

        let fs;
        let nodePath;
        try {
            fs = require("node:fs/promises");
            nodePath = require("node:path");
        } catch (error) {
            throw new Error("Fallback Node.js indisponible");
        }

        const absolutePath = nodePath.resolve(__dirname || process.cwd(), path);
        const content = await fs.readFile(absolutePath, "utf8");
        return JSON.parse(content);
    }

    let lastError = null;

    for (const path of FALLBACK_PATHS) {
        try {
            const response = await fetch(path);
            if (!response.ok) {
                lastError = new Error(`HTTP ${response.status}`);
                continue;
            }
            return response.json();
        } catch (error) {
            lastError = error;
        }

        try {
            const localFallback = await loadNodeFallback(path);
            if (localFallback) return localFallback;
        } catch (error) {
            lastError = error;
        }
    }

    throw lastError || new Error(ERROR_MESSAGES.NETWORK);
}

function logFallbackError(error) {
    if (typeof console !== "undefined" && typeof console.warn === "function") {
        const message = error && error.message ? error.message : "erreur inconnue";
        console.warn(`Chargement Google Sheets échoué, utilisation du fallback JSON: ${message}`);
    }
}

async function loadRoadbookData() {
    try {
        return await loadGoogleSheetRoadbook();
    } catch (error) {
        logFallbackError(error);
        try {
            return await loadFallbackRoadbook();
        } catch (fallbackError) {
            // Keep explicit HTTP status from Sheets so server-side failures stay distinguishable from local fallback issues.
            if (typeof error?.message === "string" && error.message.startsWith("HTTP ")) {
                throw error;
            }
            throw fallbackError;
        }
    }
}

if (typeof window !== "undefined") {
    window.loadRoadbookData = loadRoadbookData;
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = {
        ETAPES_URL,
        VARIANTES_URL,
        parseCsv,
        loadGoogleSheetRoadbook,
        loadFallbackRoadbook,
        loadRoadbookData
    };
}
