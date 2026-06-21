# Enrichissement des points d’intérêt

`enrich-pois.js` est un outil manuel, indépendant de l’application. Il lit les points d’intérêt des onglets Google Sheets publiés, recherche une correspondance dans Wikidata, puis récupère si possible une description, des coordonnées et l’URL d’une image Wikimedia Commons.

## Lancer le script

Node.js 18 ou une version plus récente est nécessaire :

```bash
node scripts/enrich-pois.js
```

ou avec la commande npm :

```bash
npm run enrich:pois
```

Le rythme et le timeout peuvent être configurés :

```bash
POI_DELAY_MS=500 POI_TIMEOUT_MS=12000 node scripts/enrich-pois.js
```

Sous PowerShell, définir les variables avec `$env:POI_DELAY_MS` et `$env:POI_TIMEOUT_MS`.

## Fichier produit

Le résultat est écrit dans :

```text
data/poi-enrichment.json
```

Chaque entrée contient le nom original du Sheet, une image éventuelle, une courte description, des coordonnées éventuelles, la source `wikidata` et un statut.

## Limites

- Une recherche par nom peut être ambiguë ou ne retourner aucun élément Wikidata suffisamment proche.
- Certains éléments Wikidata ne possèdent ni image, ni description française, ni coordonnées.
- Une image est résolue par l’API Wikimedia Commons ; aucun scraping web n’est effectué.
- Un échec individuel est enregistré sans arrêter les autres recherches.
- Le script ne modifie jamais Google Sheets ni l’application principale.
- Aucun lien Wikipédia n’est recherché, enregistré ou ajouté au JSON.
