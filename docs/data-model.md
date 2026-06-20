# Modele de donnees du roadbook

Le fichier `data/roadbook.json` est la source unique du contenu affiche. `index.html` ne contient aucune etape.

## Organisation

- `schemaVersion` permet de faire evoluer le format sans ambiguite.
- `roadbook` contient les metadonnees, l'identite visuelle et la liste ordonnee des jours.
- chaque jour possede un `id` stable et ses metriques normalisees (`distanceKm`, `elevationGainM`, `durationMinutes`).
- `route.gpx`, `route.start`, `route.end` et `photos` sont deja reserves pour les prochains sprints.
- les listes `pois` et `supply` utilisent des objets extensibles plutot que des chaines opaques.

## Ajouter une etape

Dupliquer un objet dans `roadbook.days`, lui donner un `id` unique et renseigner les champs obligatoires. La navigation, les totaux, la liste des etapes et la fiche detaillee seront mis a jour automatiquement.

## Architecture JavaScript

- `roadbook-store.js` valide et normalise les donnees, calcule les statistiques et gere la selection.
- `roadbook-view.js` transforme l'etat en elements DOM.
- `app.js` charge le JSON et relie le store a la vue.

Les futurs modules (carte Leaflet, lecteur GPX, galerie et PWA) pourront s'abonner au store ou lire les champs reserves sans modifier le HTML.

