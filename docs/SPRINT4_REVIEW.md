# Revue Sprint 4 — Carte interactive

## Ce qui a été implémenté

- Modèle `route` optionnel avec coordonnées `start`, `end` et tableau `points`.
- Validation des latitudes et longitudes dans le store normalisé.
- Carte générale Leaflet alimentée exclusivement par l’état du store.
- Marqueurs accessibles pour chaque départ et arrivée disponibles.
- Ligne directe entre le départ et l’arrivée d’une étape.
- Recentrage automatique lors de la sélection d’une étape.
- Repli accessible lorsque Leaflet ou les coordonnées sont indisponibles.
- Hauteurs et mise en page adaptées au mobile, à la tablette et à l’ordinateur.

## Choix techniques

- Leaflet 1.9.4 est chargé depuis le CDN recommandé par le site officiel, avec SRI.
- `js/map/map-adapter.js` est la seule couche qui connaît l’API Leaflet.
- L’adaptateur expose `renderRoadbook`, `focusDay` et `destroy`, ce qui permet de
  remplacer la bibliothèque sans modifier le store ou la vue.
- La carte s’abonne au store depuis `app.js`; elle ne charge jamais le JSON.
- Les coordonnées invalides sont normalisées à `null` avant d’atteindre la carte.
- OpenStreetMap fournit le fond cartographique avec attribution visible.

## Limites actuelles

- Les segments sont des lignes directes entre départ et arrivée.
- `route.points` est validé mais n’est pas encore affiché.
- Le fond de carte nécessite une connexion réseau.
- Aucun fichier GPX n’est chargé ou interprété.
- La carte ne remplace pas une solution de navigation GPS.

## Recommandations Sprint 5

- Définir le contrat du fichier GPX et sa politique d’erreur avant tout rendu.
- Ajouter un parseur GPX indépendant de Leaflet et testable sans navigateur.
- Transformer les traces en données normalisées avant de les transmettre à l’adaptateur.
- Mettre en cache les traces déjà chargées pendant la session.
- Conserver le rendu par ligne directe comme repli lorsqu’un GPX est absent.

La PWA, la météo et la galerie photo restent hors du périmètre de ce sprint.
