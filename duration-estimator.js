"use strict";

(function initializeDurationEstimator(global) {
    const GPX_CACHE = new Map();
    const FLAT_SPEED_KMH = 11;
    const CLIMB_METERS_PER_HOUR = 600;
    const PAUSE_HOURS = 0.5;
    const ELEVATION_NOISE_THRESHOLD_M = 3;

    function finiteNumber(value) {
        if (value === null || value === undefined || value === "") return null;
        const number = Number(value);
        return Number.isFinite(number) ? number : null;
    }

    function sheetStageMetrics(stage) {
        const hasElevationGain = Object.prototype.hasOwnProperty.call(stage || {}, "elevationGain");
        const elevationGain = finiteNumber(stage?.elevationGain);
        return {
            distanceKm: finiteNumber(stage?.distance),
            elevationGainM: elevationGain ?? (
                hasElevationGain ? null : finiteNumber(stage?.elevation)
            ),
            elevationLossM: finiteNumber(stage?.elevationLoss)
        };
    }

    function fallbackSpeed(elevationGain) {
        const gain = Math.max(0, finiteNumber(elevationGain) ?? 0);
        if (gain < 300) return 11;
        if (gain < 700) return 9;
        if (gain < 1200) return 7;
        return 5.5;
    }

    function estimateFallbackHours(distanceKm, elevationGain) {
        const distance = finiteNumber(distanceKm);
        if (distance === null || distance < 0) return null;
        return distance / fallbackSpeed(elevationGain) + PAUSE_HOURS;
    }

    function estimateGpxHours(distanceKm, elevationGain) {
        const distance = finiteNumber(distanceKm);
        if (distance === null || distance < 0) return null;
        const gain = Math.max(0, finiteNumber(elevationGain) ?? 0);
        return distance / FLAT_SPEED_KMH + gain / CLIMB_METERS_PER_HOUR + PAUSE_HOURS;
    }

    function formatDuration(hours) {
        if (!Number.isFinite(hours) || hours < 0) return "";
        const roundedMinutes = Math.round((hours * 60) / 5) * 5;
        const wholeHours = Math.floor(roundedMinutes / 60);
        const minutes = roundedMinutes % 60;
        return `${wholeHours} h ${String(minutes).padStart(2, "0")}`;
    }

    function haversineDistanceKm(first, second) {
        const toRadians = degrees => degrees * Math.PI / 180;
        const earthRadiusKm = 6371.0088;
        const latitudeDelta = toRadians(second.lat - first.lat);
        const longitudeDelta = toRadians(second.lng - first.lng);
        const firstLatitude = toRadians(first.lat);
        const secondLatitude = toRadians(second.lat);
        const a =
            Math.sin(latitudeDelta / 2) ** 2 +
            Math.cos(firstLatitude) * Math.cos(secondLatitude) *
            Math.sin(longitudeDelta / 2) ** 2;
        return 2 * earthRadiusKm * Math.asin(Math.min(1, Math.sqrt(a)));
    }

    function parsePoint(node) {
        const lat = finiteNumber(node.getAttribute("lat"));
        const lng = finiteNumber(node.getAttribute("lon"));
        if (lat === null || lng === null) return null;
        const elevationNode = node.getElementsByTagName("ele")[0];
        return {
            lat,
            lng,
            elevation: elevationNode ? finiteNumber(String(elevationNode.textContent || "").trim().replace(",", ".")) : null
        };
    }

    function calculateElevationProfile(sequences) {
        const elevations = sequences
            .flat()
            .map(point => point.elevation)
            .filter(Number.isFinite);

        if (!elevations.length) {
            return {
                elevationGainM: null,
                elevationLossM: null,
                elevationMinM: null,
                elevationMaxM: null
            };
        }

        let elevationGainM = 0;
        let elevationLossM = 0;

        sequences.forEach(sequence => {
            let previousElevation = null;
            let pendingDelta = 0;

            sequence.forEach(point => {
                if (!Number.isFinite(point.elevation)) return;
                if (previousElevation === null) {
                    previousElevation = point.elevation;
                    return;
                }

                const difference = point.elevation - previousElevation;
                previousElevation = point.elevation;
                pendingDelta += difference;

                if (Math.abs(pendingDelta) >= ELEVATION_NOISE_THRESHOLD_M) {
                    if (pendingDelta > 0) elevationGainM += pendingDelta;
                    else elevationLossM += Math.abs(pendingDelta);
                    pendingDelta = 0;
                }
            });
        });

        return {
            elevationGainM,
            elevationLossM,
            elevationMinM: Math.min(...elevations),
            elevationMaxM: Math.max(...elevations)
        };
    }

    function parseGpxMetrics(xmlText, DOMParserImpl = global.DOMParser) {
        if (typeof DOMParserImpl !== "function") throw new Error("Parseur XML indisponible");
        const document = new DOMParserImpl().parseFromString(String(xmlText ?? ""), "application/xml");
        if (document.getElementsByTagName("parsererror").length) {
            throw new Error("GPX invalide");
        }

        const trackSegments = Array.from(document.getElementsByTagName("trkseg"));
        let sequences = trackSegments.map(segment =>
            Array.from(segment.getElementsByTagName("trkpt")).map(parsePoint).filter(Boolean)
        );

        if (!sequences.some(points => points.length > 1)) {
            const trackPoints = Array.from(document.getElementsByTagName("trkpt")).map(parsePoint).filter(Boolean);
            const routePoints = Array.from(document.getElementsByTagName("rtept")).map(parsePoint).filter(Boolean);
            sequences = [trackPoints.length > 1 ? trackPoints : routePoints];
        }

        const points = sequences.flat();
        if (points.length < 2) throw new Error("GPX sans trace exploitable");
        const elevationPointCount = points.filter(point => point.elevation !== null).length;

        let distanceKm = 0;
        sequences.forEach(sequence => {
            for (let index = 1; index < sequence.length; index += 1) {
                distanceKm += haversineDistanceKm(sequence[index - 1], sequence[index]);
            }
        });

        if (!(distanceKm > 0)) throw new Error("Distance GPX indisponible");

        const hasCompleteElevation = elevationPointCount === points.length;
        const elevationProfile = hasCompleteElevation
            ? calculateElevationProfile(sequences)
            : {
                elevationGainM: null,
                elevationLossM: null,
                elevationMinM: null,
                elevationMaxM: null
            };

        return {
            distanceKm,
            elevationGainM: elevationProfile.elevationGainM,
            elevationLossM: elevationProfile.elevationLossM,
            elevationMinM: elevationProfile.elevationMinM,
            elevationMaxM: elevationProfile.elevationMaxM,
            pointCount: points.length,
            elevationPointCount,
            hasElevation: elevationPointCount > 0,
            hasCompleteElevation
        };
    }

    function absoluteUrl(value) {
        try {
            const url = new URL(value, global.location?.href || "http://localhost/");
            return ["http:", "https:"].includes(url.protocol) ? url.href : "";
        } catch (error) {
            return "";
        }
    }

    function loadGpxMetrics(gpxUrl, fetchImpl = global.fetch) {
        const url = absoluteUrl(gpxUrl);
        if (!url || typeof fetchImpl !== "function") {
            return Promise.resolve({ metrics: null, error: new Error("GPX indisponible") });
        }
        if (GPX_CACHE.has(url)) return GPX_CACHE.get(url);

        const request = Promise.resolve()
            .then(() => fetchImpl(url, { headers: { Accept: "application/gpx+xml, application/xml, text/xml" } }))
            .then(response => {
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                return response.text();
            })
            .then(text => {
                const metrics = parseGpxMetrics(text);
                console.info("[GPX Metrics] Diagnostic altitude", {
                    url,
                    pointCount: metrics.pointCount,
                    elevationPointCount: metrics.elevationPointCount,
                    elevationMinM: metrics.elevationMinM,
                    elevationMaxM: metrics.elevationMaxM,
                    elevationGainM: metrics.elevationGainM,
                    elevationLossM: metrics.elevationLossM,
                    hasCompleteElevation: metrics.hasCompleteElevation
                });
                if (metrics.elevationPointCount === 0) {
                    console.info("[GPX Metrics] Ce GPX ne contient pas de données d'altitude.");
                }
                return { metrics, error: null };
            })
            .catch(error => ({ metrics: null, error }));

        GPX_CACHE.set(url, request);
        return request;
    }

    async function estimateStageDuration(stage, { gpxUrl = "", fetchImpl = global.fetch } = {}) {
        const sheetMetrics = sheetStageMetrics(stage);
        const fallbackHours = estimateFallbackHours(
            sheetMetrics.distanceKm,
            sheetMetrics.elevationGainM
        );

        if (!gpxUrl) {
            return {
                hours: fallbackHours,
                formatted: formatDuration(fallbackHours),
                source: "fallback",
                metrics: sheetMetrics
            };
        }

        const { metrics: gpxMetrics } = await loadGpxMetrics(gpxUrl, fetchImpl);
        if (!gpxMetrics) {
            return {
                hours: fallbackHours,
                formatted: formatDuration(fallbackHours),
                source: "fallback",
                metrics: sheetMetrics
            };
        }

        const finalMetrics = {
            distanceKm: sheetMetrics.distanceKm ?? gpxMetrics.distanceKm,
            elevationGainM: sheetMetrics.elevationGainM ?? gpxMetrics.elevationGainM,
            elevationLossM: sheetMetrics.elevationLossM ?? gpxMetrics.elevationLossM
        };
        const hours = estimateGpxHours(finalMetrics.distanceKm, finalMetrics.elevationGainM);
        return {
            hours,
            formatted: formatDuration(hours),
            source: "gpx",
            metrics: finalMetrics,
            gpxMetrics
        };
    }

    const api = Object.freeze({
        estimateFallbackHours,
        estimateGpxHours,
        estimateStageDuration,
        fallbackSpeed,
        formatDuration,
        parseGpxMetrics,
        sheetStageMetrics,
        cacheSize: () => GPX_CACHE.size,
        clearCache: () => GPX_CACHE.clear()
    });

    global.roadbookDurationEstimator = api;
    if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
