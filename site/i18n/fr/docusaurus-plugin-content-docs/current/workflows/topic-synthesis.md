# Topic Synthesis

## Objectif

Créer une Topic Synthesis via un pipeline automatisé en trois étapes, effectuant une analyse et une synthèse systématiques d'un groupe d'articles connexes.

Correspondant au flux de création de Sujet dans le Synthesis Workbench, ce workflow fournit un traitement de bout en bout depuis la graine de sujet jusqu'à un rapport d'analyse complet.

## Cas d'Usage

- Créer une analyse de sujet complète autour d'une direction de recherche
- Construire automatiquement une taxonomie, des affirmations clés, une chronologie et des directions futures
- Générer un rapport d'analyse de synthèse structuré

## Contraintes d'Entrée

| Type de Contrainte | Description |
|---------|------|
| Unité d'Entrée | workflow (aucune notice n'a besoin d'être sélectionnée) |
| Méthode de Déclenchement | Exécuter depuis le Tableau de Bord, ou déclenché dans le Synthesis Workbench |

## Flux d'Exécution

Ce workflow consiste en **3 compétences exécutées séquentiellement** qui se passent automatiquement le relais :

```
1. create-topic-synthesis-prepare
   └── Recevoir la graine de sujet
       └── Créer l'intention du sujet
       └── Construire l'ensemble de travail des articles
       └── Préparer le contexte d'analyse

2. topic-synthesis-core-enrichment
   └── Enrichissement central
       └── Écrire la Taxonomie (système de classification)
       └── Construire la Chronologie
       └── Extraire les Affirmations
       └── Analyser les Directions Futures
       └── Générer le Plan de Revue
       └── Complétion du graphe de connaissances

3. topic-synthesis-finalize
   └── Détermination de la couverture
       └── Générer le résumé de contexte externe
       └── Suggestions de curation
       └── Générer le résumé d'analyse final
```

## Sorties

Une fois l'exécution terminée, les résultats de la synthèse de sujet sont écrits dans le stockage persistant du système Synthesis et reflétés dans les vues Sujets et Graphe du Synthesis Workbench.

Les sorties spécifiques incluent :

- **Métadonnées du Sujet** : Nom, description, date de création
- **Taxonomie** : Système de classification hiérarchique des sujets
- **Événements Chronologiques** : Événements importants organisés chronologiquement
- **Affirmations** : Affirmations clés extraites et leurs preuves
- **Comparaisons** : Analyse comparative multi-dimensionnelle
- **Directions Futures** : Suggestions de directions de recherche futures
- **Couverture** : Analyse de la couverture littéraire
- **Rapport** : Rapport d'analyse de synthèse

![Page d'Aperçu de Topic Synthesis](/img/docs/workflows/topic-synthesis_overview.png)

![Page Taxonomie de Topic Synthesis](/img/docs/workflows/topic-synthesis_taxonomy.png)

![Page Affirmations de Topic Synthesis](/img/docs/workflows/topic-synthesis_claims.png)

![Page Comparaison de Topic Synthesis](/img/docs/workflows/topic-synthesis_compare.png)

![Page Directions Futures de Topic Synthesis](/img/docs/workflows/topic-synthesis_future-directions.png)

![Page Couverture de Topic Synthesis](/img/docs/workflows/topic-synthesis_coverage.png)

![Page Rapport de Topic Synthesis](/img/docs/workflows/topic-synthesis_report.png)

![Page Références de Topic Synthesis](/img/docs/workflows/topic-synthesis_references.png)

![Sous-graphe d'Articles de Topic Synthesis](/img/docs/workflows/topic-synthesis_subgraph.png)

## Paramètres

| Paramètre | Type | Description | Défaut |
|------|------|------|--------|
| `topicSeed` | string | Graine de sujet décrivant le sujet à créer | — |
| `language` | string | Langue de sortie | `auto` |

### Description de language

- `auto` : Détection automatique (utilise généralement la langue de l'interface du plugin)
- `zh-CN` : Chinois
- `en-US` : Anglais

## Dépendances

- **Backend** : Backend ACP
- **Système Synthesis** : Nécessite que le Synthesis Workbench soit initialisé
- **Articles de la Bibliothèque** : Il est recommandé d'avoir déjà un nombre suffisant d'articles connexes dans la bibliothèque

:::tip Préparation Recommandée
Avant de créer un Sujet, il est recommandé de :
1. S'assurer que tous les articles connexes ont été traités par [Literature Analysis](literature-analysis)
2. S'assurer que les articles connexes ont été traités par [Tag Regulator](tag-regulator)
3. Exécuter **Advance Matching** (déduplication avancée de correspondance de citations) sur la page Index du Synthesis Workbench
4. Traiter tous les éléments d'approbation sur la page Revue (n'oubliez pas d'"Appliquer" les décisions en attente)

Les relations précises du graphe de citation affectent directement la qualité du calcul d'importance des articles dans Topic Synthesis (PageRank, score de front, etc.), améliorant ainsi la qualité globale de l'aperçu du Sujet.
:::

## Durée Estimée

| Taille du Sujet | Durée Estimée |
|---------|---------|
| Petit sujet (≤10 articles) | 8-12 minutes |
| Sujet moyen (10-30 articles) | 12-18 minutes |
| Grand sujet (30+ articles) | 18-25 minutes |

S'il y a beaucoup d'articles, il est recommandé d'utiliser plutôt la fonctionnalité de mise à jour pour une itération incrémentale.

## Recommandation de Modèle

🔴 Des modèles avec une **forte compréhension du texte + contexte long** sont recommandés. Topic Synthesis nécessite une analyse complète d'un grand nombre de résumés d'articles, de relations de citation, de balises et de connaissances conceptuelles, ce qui en fait une tâche intensive en calcul. Si le backend prend en charge la délégation à des sous-agents, le pipeline multi-étapes peut être exécuté plus efficacement.

## Workflows Associés

- [Aperçu du Synthesis Workbench](../synthesis/) — Guide d'utilisation du Synthesis Workbench
- [Manuscript Literature Framing](manuscript-literature-framing) — Rédiger des introductions d'articles basées sur les résultats de Topic Synthesis
