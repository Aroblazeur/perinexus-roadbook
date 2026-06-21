"use strict";

const fs = require("node:fs/promises");
const path = require("node:path");

const SHEET_ID = "1jhlhFPZF-oeAaiJ0pLKKagNMMa-SBxJ9HgnB4SMnyPU";
const SHEET_URLS = [
    process.env.ROADBOOK_ETAPES_URL || googleSheetCsvUrl("etapes principales"),
    process.env.ROADBOOK_VARIANTES_URL || googleSheetCsvUrl("Variante et option")
];
const WIKIDATA_API = "https://www.wikidata.org/w/api.php";
const COMMONS_API = "https://commons.wikimedia.org/w/api.php";
const OUTPUT_PATH = path.resolve(__dirname, "..", "data", "poi-enrichment.json");
const REQUEST_DELAY_MS = toNonNegativeInteger(process.env.POI_DELAY_MS, 250);
const REQUEST_TIMEOUT_MS = toNonNegativeInteger(process.env.POI_TIMEOUT_MS, 8_000);
const SEARCH_LANGUAGES = ["fr", "ca", "es", "en"];
const USER_AGENT = "PerinexusRoadbookPOITool/1.0 (+https://github.com/Aroblazeur/perinexus-roadbook)";

let lastApiRequestAt = 0;

async function main() {
    if (typeof fetch !== "function") {
        throw new Error("Ce script nécessite Node.js 18 ou une version plus récente (fetch natif).");
    }

    console.log("[POI] Lecture des onglets Google Sheets publiés…");
    const csvDocuments = await Promise.all(SHEET_URLS.map(url => fetchText(url)));
    const poiNames = collectPoiNames(csvDocuments.flatMap(parseCsv));
    const items = [];

    console.log(`[POI] ${poiNames.length} point(s) d’intérêt unique(s) à enrichir.\n`);

    for (let index = 0; index < poiNames.length; index += 1) {
        const name = poiNames[index];
        const item = await enrichPoi(name);
        items.push(item);
        printReport(index + 1, poiNames.length, item);
    }

    const output = {
        generatedAt: new Date().toISOString(),
        items
    };
    const serialized = `${JSON.stringify(output, null, 2)}\n`;

    if (/wikipedia/i.test(serialized)) {
        throw new Error("Validation échouée : un lien Wikipédia a été détecté dans la sortie.");
    }

    await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
    await fs.writeFile(OUTPUT_PATH, serialized, "utf8");

    const successCount = items.filter(item => item.status === "ok").length;
    console.log(`\n[POI] Terminé : ${successCount}/${items.length} POI enrichi(s).`);
    console.log(`[POI] Rapport écrit dans ${OUTPUT_PATH}`);
}

async function enrichPoi(name) {
    try {
        const candidate = await findBestWikidataCandidate(name);
        if (!candidate) return emptyPoi(name, "not_found");

        const entity = await fetchWikidataEntity(candidate.id);
        if (!entity) return emptyPoi(name, "not_found");

        const imageName = claimValue(entity.claims?.P18);
        let image = "";
        if (typeof imageName === "string" && imageName.trim()) {
            try {
                image = await fetchCommonsImageUrl(imageName.trim());
            } catch (error) {
                image = "";
            }
        }

        return {
            name,
            image,
            description: shortDescription(entityDescription(entity) || candidate.description),
            coordinates: coordinatesFromClaims(entity.claims?.P625),
            source: "wikidata",
            status: "ok"
        };
    } catch (error) {
        return {
            ...emptyPoi(name, "error"),
            error: formatError(error)
        };
    }
}

async function findBestWikidataCandidate(name) {
    const queries = buildSearchQueries(name);
    let best = null;

    for (const query of queries) {
        for (const language of SEARCH_LANGUAGES) {
            const url = new URL(WIKIDATA_API);
            url.search = new URLSearchParams({
                action: "wbsearchentities",
                format: "json",
                type: "item",
                limit: "7",
                language,
                uselang: "fr",
                search: query
            }).toString();

            const data = await fetchJson(url);
            const results = Array.isArray(data.search) ? data.search : [];
            results.forEach(candidate => {
                const score = scoreCandidate(candidate, queries);
                if (!best || score > best.score) best = { ...candidate, score };
            });

            if (best?.score >= 95) return best;
        }
    }

    return best && best.score >= 45 ? best : null;
}

async function fetchWikidataEntity(id) {
    if (!/^Q\d+$/.test(String(id || ""))) return null;
    const url = new URL(WIKIDATA_API);
    url.search = new URLSearchParams({
        action: "wbgetentities",
        format: "json",
        ids: id,
        props: "claims|descriptions|labels",
        languages: "fr|ca|es|en",
        languagefallback: "1"
    }).toString();
    const data = await fetchJson(url);
    const entity = data.entities?.[id];
    return entity && !entity.missing ? entity : null;
}

async function fetchCommonsImageUrl(filename) {
    const url = new URL(COMMONS_API);
    url.search = new URLSearchParams({
        action: "query",
        format: "json",
        prop: "imageinfo",
        iiprop: "url",
        titles: `File:${filename}`
    }).toString();
    const data = await fetchJson(url);
    const pages = Object.values(data.query?.pages || {});
    const imageUrl = pages[0]?.imageinfo?.[0]?.url;
    if (!safeHttpUrl(imageUrl)) return "";
    return `https://commons.wikimedia.org/wiki/Special:Redirect/file/${encodeURIComponent(filename)}`;
}

async function fetchJson(url) {
    const elapsed = Date.now() - lastApiRequestAt;
    if (lastApiRequestAt && elapsed < REQUEST_DELAY_MS) await delay(REQUEST_DELAY_MS - elapsed);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
        const response = await fetch(url, {
            signal: controller.signal,
            headers: {
                Accept: "application/json",
                "User-Agent": USER_AGENT
            }
        });
        if (!response.ok) throw new Error(`HTTP ${response.status} pour ${url.hostname}`);
        return JSON.parse(await response.text());
    } catch (error) {
        if (error?.name === "AbortError") {
            throw new Error(`délai dépassé après ${REQUEST_TIMEOUT_MS} ms pour ${url.hostname}`);
        }
        throw error;
    } finally {
        clearTimeout(timeout);
        lastApiRequestAt = Date.now();
    }
}

async function fetchText(url) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
        const response = await fetch(url, {
            signal: controller.signal,
            headers: { "User-Agent": USER_AGENT }
        });
        if (!response.ok) throw new Error(`Google Sheet indisponible (HTTP ${response.status})`);
        return response.text();
    } catch (error) {
        if (error?.name === "AbortError") throw new Error("Délai dépassé pendant la lecture du Google Sheet.");
        throw error;
    } finally {
        clearTimeout(timeout);
    }
}

function collectPoiNames(rows) {
    const unique = new Map();
    rows.forEach(record => {
        splitMulti(record["point d interet"]).forEach(name => {
            const key = normalizeSearchText(name);
            if (key && !unique.has(key)) unique.set(key, normalizeWhitespace(name));
        });
    });
    return [...unique.values()];
}

function buildSearchQueries(name) {
    const original = normalizeWhitespace(name);
    const translated = original
        .replace(/\bvoie\s+verte\s+du\b/i, "Via Verda del")
        .replace(/\bvoie\s+verte\s+de\s+la\b/i, "Via Verda de la");
    const distinctive = original.replace(
        /^(?:voie\s+verte\s+(?:du|de\s+la)|via\s+verda\s+(?:del|de\s+la)|platja\s+(?:de\s+la|de\s+l['’]|d['’]en)?|cala\s+(?:de\s+la|de\s+l['’]|d['’]en)?)/i,
        ""
    ).trim();
    return [...new Set([original, translated, distinctive].filter(value => value.length >= 3))];
}

function scoreCandidate(candidate, queries) {
    const description = normalizeSearchText(candidate.description);
    if (/homonymie|disambiguation|desambiguacion/.test(description)) return -100;

    const candidateTexts = [candidate.label, candidate.match?.text]
        .map(normalizeSearchText)
        .filter(Boolean);
    let best = 0;

    queries.map(normalizeSearchText).forEach(query => {
        candidateTexts.forEach(candidateText => {
            if (candidateText === query) {
                best = Math.max(best, 100);
                return;
            }
            if (candidateText.includes(query) || query.includes(candidateText)) {
                best = Math.max(best, 72);
            }
            const queryTokens = new Set(query.split(" ").filter(token => token.length > 2));
            const candidateTokens = new Set(candidateText.split(" ").filter(token => token.length > 2));
            const intersection = [...queryTokens].filter(token => candidateTokens.has(token)).length;
            const denominator = Math.max(queryTokens.size, candidateTokens.size, 1);
            best = Math.max(best, Math.round((intersection / denominator) * 65));
        });
    });
    return best;
}

function claimValue(claims) {
    const claim = (Array.isArray(claims) ? claims : [])
        .find(item => item.rank !== "deprecated" && item.mainsnak?.snaktype === "value");
    return claim?.mainsnak?.datavalue?.value ?? null;
}

function coordinatesFromClaims(claims) {
    const value = claimValue(claims);
    const lat = Number(value?.latitude);
    const lng = Number(value?.longitude);
    return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

function entityDescription(entity) {
    for (const language of SEARCH_LANGUAGES) {
        const value = entity.descriptions?.[language]?.value;
        if (value) return value;
    }
    return "";
}

function shortDescription(value) {
    const description = normalizeWhitespace(value);
    if (description.length <= 240) return description;
    const truncated = description.slice(0, 237);
    const boundary = truncated.lastIndexOf(" ");
    return `${truncated.slice(0, boundary > 160 ? boundary : 237).trim()}…`;
}

function emptyPoi(name, status) {
    return {
        name,
        image: "",
        description: "",
        coordinates: null,
        source: "wikidata",
        status
    };
}

function safeHttpUrl(value) {
    if (typeof value !== "string" || !value.trim()) return "";
    try {
        const url = new URL(value.trim());
        return ["http:", "https:"].includes(url.protocol) ? url.href : "";
    } catch (error) {
        return "";
    }
}

function splitMulti(value) {
    return String(value || "")
        .split("---")
        .map(normalizeWhitespace)
        .filter(Boolean);
}

function parseCsv(csvText) {
    const input = String(csvText || "").replace(/^\uFEFF/, "");
    const rows = [];
    let row = [];
    let cell = "";
    let quoted = false;

    for (let index = 0; index < input.length; index += 1) {
        const character = input[index];
        const next = input[index + 1];
        if (character === '"') {
            if (quoted && next === '"') {
                cell += '"';
                index += 1;
            } else {
                quoted = !quoted;
            }
        } else if (!quoted && character === ",") {
            row.push(cell);
            cell = "";
        } else if (!quoted && (character === "\n" || character === "\r")) {
            if (character === "\r" && next === "\n") index += 1;
            row.push(cell);
            if (row.some(value => value.trim())) rows.push(row);
            row = [];
            cell = "";
        } else {
            cell += character;
        }
    }

    if (quoted) throw new Error("CSV Google Sheets invalide : guillemet non fermé.");
    if (cell || row.length) {
        row.push(cell);
        if (row.some(value => value.trim())) rows.push(row);
    }
    if (!rows.length) return [];

    const [headers, ...dataRows] = rows;
    const normalizedHeaders = headers.map(normalizeHeader);
    return dataRows.map(values => Object.fromEntries(
        normalizedHeaders.map((header, index) => [header, normalizeWhitespace(values[index])])
    ));
}

function normalizeHeader(value) {
    return normalizeSearchText(value);
}

function normalizeSearchText(value) {
    return normalizeWhitespace(value)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[’']/g, " ")
        .replace(/[^\p{L}\p{N}]+/gu, " ")
        .trim()
        .toLowerCase();
}

function normalizeWhitespace(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
}

function googleSheetCsvUrl(sheetName) {
    return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
}

function printReport(index, total, item) {
    console.log(`[${index}/${total}] ${item.name}`);
    console.log(`  Statut      : ${item.status}${item.error ? ` · ${item.error}` : ""}`);
    console.log(`  Description : ${item.description || "non trouvée"}`);
    console.log(`  Image       : ${item.image ? "trouvée" : "non trouvée"}`);
    console.log(`  Coordonnées : ${item.coordinates ? `${item.coordinates.lat}, ${item.coordinates.lng}` : "non trouvées"}`);
}

function formatError(error) {
    return normalizeWhitespace(error?.message || String(error || "erreur inconnue"));
}

function toNonNegativeInteger(value, fallback) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function delay(milliseconds) {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
}

if (require.main === module) {
    main().catch(error => {
        console.error(`[POI] Échec global : ${formatError(error)}`);
        process.exitCode = 1;
    });
}

module.exports = {
    buildSearchQueries,
    collectPoiNames,
    normalizeSearchText,
    parseCsv,
    scoreCandidate,
    shortDescription
};
