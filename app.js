"use strict";

/**
 * =====================================================
 * Perinexus Roadbook
 * =====================================================
 */

let roadbook = null;
let currentDay = 0;

/**
 * Chargement des données
 */
async function loadRoadbook() {

    try {

        const response = await fetch("data/roadbook.json");

        roadbook = await response.json();

        updateSummary();

        displayDay(currentDay);

    } catch (error) {

        console.error(error);

        document.getElementById("roadbook-info").textContent =
            "Impossible de charger le roadbook.";

    }

}

/**
 * Résumé
 */
function updateSummary() {

    const info = document.getElementById("roadbook-info");

    info.innerHTML = `
        <strong>${roadbook.title}</strong><br>
        ${roadbook.description}<br><br>

        Nombre d'étapes : ${roadbook.days.length}
    `;

}

/**
 * Affichage d'une journée
 */
function displayDay(index) {

    if (!roadbook) return;

    const day = roadbook.days[index];

    document.getElementById("current-day").textContent =
        `Jour ${index + 1}`;

    document.getElementById("day-title").textContent =
        day.title;

    document.getElementById("distance").textContent =
        `${day.distance} km`;

    document.getElementById("elevation").textContent =
        `${day.elevation} m`;

    document.getElementById("duration").textContent =
        day.duration;

    document.getElementById("description").textContent =
        day.description;

    document.getElementById("accommodation").textContent =
        day.accommodation;

    updatePois(day);

    updateButtons();

}

/**
 * Points d'intérêt
 */
function updatePois(day) {

    const list = document.getElementById("pois");

    list.innerHTML = "";

    day.pois.forEach(poi => {

        const li = document.createElement("li");

        li.textContent = poi;

        list.appendChild(li);

    });

}

/**
 * Navigation
 */
function previousDay() {

    if (currentDay > 0) {

        currentDay--;

        displayDay(currentDay);

    }

}

function nextDay() {

    if (currentDay < roadbook.days.length - 1) {

        currentDay++;

        displayDay(currentDay);

    }

}

/**
 * Active / désactive les boutons
 */
function updateButtons() {

    document.getElementById("previous-day").disabled =
        currentDay === 0;

    document.getElementById("next-day").disabled =
        currentDay === roadbook.days.length - 1;

}

/**
 * Initialisation
 */
document
    .getElementById("previous-day")
    .addEventListener("click", previousDay);

document
    .getElementById("next-day")
    .addEventListener("click", nextDay);

loadRoadbook();
