# Modèle de données du roadbook

`data/roadbook.json` est la source unique du contenu affiché. Le contrat est
versionné par `schemaVersion`; l’application refuse explicitement une version
qu’elle ne sait pas interpréter.

## Racine

```text
schemaVersion
roadbook
  id
  title
  description
  locale
  branding
  days[]
```

`roadbook.days` détermine l’ordre de navigation et de génération des cartes.

## Contrat d’une étape

`id` et `title` sont obligatoires. Tous les champs d’affichage sont normalisés :
une valeur manquante produit « Non renseigné » plutôt qu’une erreur JavaScript.

```json
{
  "id": "identifiant-stable",
  "title": "Titre",
  "date": "",
  "departure": "",
  "arrival": "",
  "kilometers": null,
  "elevationGain": null,
  "elevationLoss": null,
  "durationMinutes": null,
  "difficulty": "",
  "accommodation": null,
  "description": "",
  "gpx": "",
  "route": {
    "start": null,
    "end": null,
    "points": []
  },
  "photos": [],
  "interest": [],
  "restaurants": [],
  "shops": [],
  "water": [],
  "variants": [],
  "notes": [],
  "warning": []
}
```

Les collections acceptent des chaînes simples ou des objets extensibles. Pour un
point utile, les clés conventionnelles sont `name`, `type` et `km`.

## Coordonnées cartographiques

`route.start` et `route.end` acceptent des objets `{ "lat": nombre, "lng": nombre }`.
Ils sont facultatifs et normalisés à `null` lorsqu’ils sont absents ou hors des
bornes géographiques. `route.points` est toujours normalisé en tableau et réserve
la place des étapes intermédiaires; il n’est pas encore tracé au Sprint 4.

## Responsabilités JavaScript

- `data-loader.js` gère le transport HTTP, les statuts non valides et le parsing JSON.
- `roadbook-store.js` valide, normalise et expose l’état de navigation.
- `utils.js` centralise les conversions, valeurs de repli et créations DOM simples.
- `card-factory.js` crée une carte complète à partir d’une journée normalisée.
- `roadbook-view.js` rend le roadbook, branche les interactions et remplace la carte active.
- `map/map-adapter.js` traduit l’état normalisé vers Leaflet et fournit un repli sans carte.
- `app.js` orchestre le démarrage et transforme les erreurs techniques en messages utilisateur.

Cette séparation permet aux futurs modules de consommer le modèle normalisé sans
dupliquer le chargement ou le rendu. Elle ne préjuge pas de leur implémentation.

## Évolution du schéma

Toute rupture du contrat doit :

1. incrémenter `schemaVersion`;
2. documenter la migration ici;
3. adapter le validateur et ses tests;
4. mettre à jour `CHANGELOG.md`.
