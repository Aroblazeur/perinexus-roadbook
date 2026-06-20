# Périnexus Roadbook

Périnexus Roadbook est une application web sans framework pour consulter un
roadbook d’itinérance à vélo. L’interface entière est générée depuis
`data/roadbook.json` : aucune étape n’est écrite dans le HTML.

## Prérequis

- Node.js 20 ou une version plus récente.
- Un navigateur moderne.

## Lancer le projet

```bash
npm start
```

Ouvrir ensuite <http://127.0.0.1:8000>. Il faut utiliser ce serveur local plutôt
que d’ouvrir directement `index.html`, car le navigateur doit charger le JSON et
les modules JavaScript par HTTP.

## Vérifier le projet

```bash
npm run verify
```

Cette commande vérifie la syntaxe des modules, exécute les tests unitaires,
valide le JSON réel et confirme qu’aucune étape n’est codée dans `index.html`.

## Modifier le roadbook

Toute modification de contenu se fait dans [`data/roadbook.json`](data/roadbook.json).
Le fichier racine `index.html` est uniquement le shell de l’application et ne
doit jamais contenir de journée.

Après une modification, exécuter `npm run verify` avant de valider les changements.

## Ajouter une étape

1. Dupliquer un objet dans `roadbook.days`.
2. Choisir un `id` unique, stable et sans espace.
3. Renseigner les champs de la carte d’étape.
4. Conserver les collections futures, même lorsqu’elles sont vides.
5. Exécuter `npm run verify` puis contrôler le rendu avec `npm start`.

Exemple minimal accepté :

```json
{
  "id": "nouvelle-etape",
  "title": "Nouvelle étape",
  "date": "15 juin 2026",
  "departure": "Ville A",
  "arrival": "Ville B",
  "kilometers": 52,
  "elevationGain": 700,
  "elevationLoss": 620,
  "durationMinutes": 270,
  "difficulty": "Modérée",
  "accommodation": {
    "name": "Gîte",
    "details": "Réservation conseillée"
  },
  "description": "Description de l’étape.",
  "gpx": "",
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

Les champs d’affichage absents sont remplacés par « Non renseigné » et ne font
pas planter l’application. `id` et `title` restent obligatoires.

## Structure de `roadbook.json`

- `schemaVersion` : version du contrat de données, actuellement `1`.
- `roadbook` : métadonnées générales du voyage.
- `roadbook.branding` : titre, accroche et contenu du pied de page.
- `roadbook.days` : liste ordonnée des étapes.

Champs principaux d’une étape :

| Champ | Type | Rôle |
| --- | --- | --- |
| `id` | chaîne | Identifiant unique et stable |
| `title`, `date` | chaînes | Identité de l’étape |
| `departure`, `arrival` | chaînes | Départ et arrivée |
| `kilometers` | nombre | Distance |
| `elevationGain`, `elevationLoss` | nombres | D+ et D- |
| `durationMinutes` | nombre | Durée estimée en minutes |
| `difficulty` | chaîne | Niveau de difficulté |
| `accommodation` | objet ou `null` | Nom et détails de l’hébergement |
| `description` | chaîne | Présentation de l’étape |
| `gpx` | chaîne | Chemin GPX réservé à un futur sprint |
| `photos` | tableau | Médias futurs |
| `interest`, `restaurants`, `shops`, `water` | tableaux | Points utiles |
| `variants`, `notes`, `warning` | tableaux | Informations complémentaires |

Le contrat détaillé est documenté dans
[`docs/data-model.md`](docs/data-model.md).

## Architecture

```text
index.html                 Shell HTML générique
style.css                  Styles responsive
data/roadbook.json         Source unique du contenu
js/app.js                  Orchestration et messages d’erreur
js/data-loader.js          Chargement HTTP et erreurs réseau/JSON
js/roadbook-store.js       Validation, normalisation et état
js/card-factory.js         Création d’une carte d’étape
js/roadbook-view.js        Rendu et interactions de l’interface
js/utils.js                Utilitaires purs et DOM
tests/                     Tests unitaires
scripts/                   Serveur local et validation du projet
docs/                      Architecture, audit et feuille de route
```

## Documentation

- [Revue du Sprint 3](docs/SPRINT3_REVIEW.md)
- [Modèle de données](docs/data-model.md)
- [Feuille de route](docs/ROADMAP.md)
- [Changelog](CHANGELOG.md)

## Licence

Projet personnel.
