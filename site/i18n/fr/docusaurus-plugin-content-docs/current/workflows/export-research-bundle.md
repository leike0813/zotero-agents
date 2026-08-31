# Export Research Bundle

## Objectif

Assembler automatiquement un bundle de recherche en lecture seule dans Dashboard Products à partir de la bibliothèque Zotero existante et du contexte Synthesis, basé sur une intention de papier déclarée. Le bundle collecte les sujets pertinents, les articles principaux et les articles connexes avec leurs artefacts d'analyse disponibles.

## Entrées

| Paramètre | Requis | Description |
| --- | --- | --- |
| `paperTitle` | Oui | Titre de travail du manuscrit utilisé pour trouver des matériaux de recherche. |
| `researchContent` | Oui | Problème de recherche, méthodes, portée et contribution prévue. |
| `articleType` | Non | Type de manuscrit (par défaut : `original research`). |
| `maxTopics` | Non | Nombre maximum de sujets pertinents à inclure, plage 0–10 (par défaut : 5). |
| `maxCorePapers` | Non | Nombre maximum d'articles principaux, plage 1–50 (par défaut : 20). |
| `maxRelatedPapers` | Non | Nombre maximum d'articles supplémentaires hors Topics, plage 1–200 (par défaut : 80). Les articles issus des Topics sélectionnés sont conservés au-delà de cette limite. |

Aucune sélection d'élément Zotero n'est requise.

## Comportement

1. Recevoir les paramètres d'intention de papier de l'utilisateur.
2. Découvrir les matériaux candidats à partir des Synthesis Topics existants et d'ancres bornées de métadonnées Zotero. La recherche compare les métadonnées indexées telles que titres, auteurs, années, publications et tags ; ce n'est pas une recherche sémantique en texte intégral.
3. Effectuer une évaluation bornée pour distinguer les articles principaux des articles connexes.
4. Assembler le Research Bundle avec des rapports de sujet, des métadonnées bibliographiques et des artefacts d'analyse v2 disponibles (résumés, références, analyses de citation, contenu de conversation).
5. Pour les articles principaux, préférer la source Markdown avec des images locales ; revenir au PDF ; enregistrer un avertissement si aucun n'est disponible.
6. Enregistrer le bundle comme un produit en lecture seule dans Dashboard Products.

L'indisponibilité de sujet, graphe, artefact d'analyse ou source se dégrade gracieusement — le workflow continue avec toute preuve encore lisible et enregistre des diagnostics et des avertissements. Si aucun article ne répond aux critères, l'exécution se termine sans enregistrer de produit.

## Sortie et application

Le Research Bundle est enregistré dans Dashboard Products comme un artefact en lecture seule. Sa structure :

| Chemin | Description |
|------|-------------|
| `README.md` | Point d'entrée pour agents et humains avec ordre de lecture suggéré, nomenclature de fichiers, index de sujet/article |
| `manifest.json` | Inventaire lisible par machine des chemins d'artefacts v2, provenance, intégrité de fichier et diagnostics |
| `topics/<topic-id>/report.md` | Rapport de synthèse de sujet (lorsque disponible) |
| `papers/<paper-id>/metadata.json` | Métadonnées bibliographiques portables par article |
| `papers/<paper-id>/source.md` | Source Markdown (lorsque disponible) |
| `papers/<paper-id>/digest-*.md` | Artefacts de résumé Literature Analysis (lorsque disponibles) |

Seuls les répertoires sémantiques `topics/` et `papers/` sont utilisés avec les fichiers racine. Les images Markdown sont incluses uniquement lorsque leur chemin local résolu se trouve dans l'arborescence du fichier Markdown ; les images hors arborescence ou manquantes conservent leurs liens d'origine mais ne sont pas enregistrées comme fichiers de produit.

## Durée estimée

Dépend de la taille de la bibliothèque, du nombre de candidats, de la disponibilité des sujets/graphes et de la vitesse de réponse du backend. La progression et les résultats sont visibles dans le panneau d'exécution.

## Recommandation de modèle

Un modèle avec une forte compréhension sémantique et une capacité d'appel d'outils est recommandé. La tâche nécessite de juger la pertinence des sujets et articles par rapport à l'intention du papier et d'utiliser correctement le contexte Zotero et Synthesis en lecture seule.

## Dépendances

- **Backend** : Skill-Runner
- **Skill** : `export-research-bundle`
- **Host Bridge** : Nécessite l'autorisation de lire le contexte Zotero et Synthesis

## Workflows connexes

- [Literature Analysis](literature-analysis) — Générer des artefacts de résumé et d'analyse de citation pouvant être inclus dans le bundle
- [Literature Search & Ingest](literature-search-ingest) — Rechercher et importer la littérature manquante avant d'assembler le bundle
- [Export/Import Literature Bundle](export-import-literature-bundle) — Exporter des bundles ZIP portables de notices Zotero (objectif différent)
