# Validation Sprint 3

## Conforme

- `index.html` est un shell générique et ne contient aucune journée.
- `data/roadbook.json` est la seule source de contenu du roadbook.
- Les cartes d’étape sont entièrement créées par `card-factory.js`.
- Le chargement, la validation, l’état, le rendu, les cartes et les utilitaires
  ont chacun un module dédié.
- Les erreurs réseau, HTTP, JSON et de schéma produisent un message utilisateur.
- Chaque étape supporte `gpx`, `photos`, `interest`, `restaurants`, `shops`,
  `water`, `variants`, `notes` et `warning`.
- Chaque carte affiche titre, date, départ, arrivée, kilomètres, D+, D-,
  difficulté, hébergement et description.
- Tous les champs facultatifs disposent d’une valeur de repli sûre.
- Le rendu a été vérifié sur mobile, tablette et ordinateur.
- La syntaxe JavaScript, le JSON réel et les tests automatisés sont valides.

## Corrections réalisées

- Suppression des fichiers historiques concurrents `roadbook.json`, `Style..css`
  et `TEST.md`.
- Migration du JSON vers un contrat canonique complet pour chaque journée.
- Extraction du chargement HTTP dans `data-loader.js`.
- Extraction de la fabrique de cartes dans `card-factory.js`.
- Centralisation des fonctions partagées dans `utils.js`.
- Simplification de `roadbook-view.js` autour du rendu et des interactions.
- Normalisation défensive des champs absents dans `roadbook-store.js`.
- Ajout de messages distincts pour les erreurs réseau, HTTP, JSON et de données.
- Adaptation responsive des métriques, trajets et cartes de détails.
- Extension des tests au chargement, aux erreurs et au contrat réel du JSON.
- Ajout d’un serveur local et d’une commande de vérification complète.
- Réécriture du README avec instructions de lancement et d’édition.

## Points restant à améliorer

Aucun point bloquant ou dette technique évidente ne reste dans le périmètre du
Sprint 3. L’automatisation de ces vérifications dans une CI pourra être ajoutée
au processus du dépôt, sans modifier l’architecture applicative.

## Recommandations Sprint 4

Prérequis techniques uniquement :

- définir un format de coordonnées versionné avant toute intégration cartographique;
- conserver la bibliothèque cartographique derrière un module adaptateur;
- consommer l’état normalisé du store plutôt que relire directement le JSON;
- prévoir un conteneur de carte générique et un rendu de repli accessible;
- ajouter des tests avec et sans coordonnées avant d’activer la carte.

Aucune fonctionnalité du Sprint 4 n’est implémentée dans cette validation.
